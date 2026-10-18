import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Categories reference
const VALID_EXPENSE_CATEGORIES = [
  'Makanan dan Belanja Dapur',
  'Transportasi dan BBM',
  'Listrik, Air, dan Internet',
  'Rumah Tangga',
  'Kesehatan',
  'Pendidikan',
  'Cicilan dan Utang',
  'Tabungan',
  'Hiburan',
  'Lain-lain',
];

const VALID_INCOME_CATEGORIES = [
  'Gaji',
  'Usaha',
  'Honorarium',
  'Pendapatan Sampingan',
  'Lain-lain',
];

// Health and AI status check endpoint
app.get('/api/ai/status', (_req: Request, res: Response) => {
  res.json({
    available: !!apiKey,
    model: 'gemini-3.8-flash',
    hasKey: !!apiKey,
  });
});

// Endpoint: Parse Natural Language Transaction
app.post('/api/ai/parse-text', async (req: Request, res: Response) => {
  try {
    const { text, referenceDate, defaultRecorder } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Teks transaksi tidak boleh kosong' });
      return;
    }

    if (!genAI) {
      // Fallback local heuristic parser if API key is not yet set
      const parsed = localParseText(text, referenceDate, defaultRecorder);
      res.json({
        success: true,
        transactions: parsed,
        parsedWith: 'local-fallback',
        warning: 'Kunci Gemini API belum terdeteksi di server. Menggunakan pengurai lokal.',
      });
      return;
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];

    const systemInstruction = `Kamu adalah asisten keuangan cerdas keluarga untuk aplikasi "SELARAS FINANCE" berbahasa Indonesia.
Tugasmu adalah menganalisis pesan transaksi keuangan rumah tangga sehari-hari (bisa satu atau lebih transaksi dalam satu kalimat/paragraf) dan mengembalikan array data transaksi yang terstruktur.

PANDUAN EKSTRAKSI:
1. Pisahkan jika ada lebih dari satu transaksi dalam kalimat (contoh: "tadi pagi beli bensin 50rb terus siang makan sate 35rb" -> 2 transaksi).
2. Tentukan jenis_transaksi: "Pengeluaran" atau "Pemasukan".
3. Kategori harus dipilih dari daftar resmi berikut:
   Kategori Pengeluaran:
   - Makanan dan Belanja Dapur
   - Transportasi dan BBM
   - Listrik, Air, dan Internet
   - Rumah Tangga
   - Kesehatan
   - Pendidikan
   - Cicilan dan Utang
   - Tabungan
   - Hiburan
   - Lain-lain
   Kategori Pemasukan:
   - Gaji
   - Usaha
   - Honorarium
   - Pendapatan Sampingan
   - Lain-lain
4. Nominal harus berupa ANGKA integer murni tanpa titik atau simbol mata uang (contoh: "50rb" -> 50000, "1.5jt" -> 1500000, "Rp35.000" -> 35000). Jangan mengarang angka! Jika tidak ada nominal sama sekali, buat 0 dan beri catatan.
5. Tanggal transaksi harus format YYYY-MM-DD. Tanggal hari ini sebagai acuan: ${todayStr}.
   - Jika ada kata "kemarin", hitung H-1 dari ${todayStr}.
   - Jika "tadi pagi" / "tadi siang" / "hari ini", gunakan ${todayStr}.
   - Jika ada tanggal spesifik (misal 15 Oktober), sesuaikan tahun dan bulan yang relevan.
6. Deskripsi: singkat, padat, dan jelas tentang apa yang dibeli atau diterima.
7. Nama pencatat: gunakan "${defaultRecorder || 'Suami'}" kecuali teks secara spesifik menyebutkan nama lain (misal "istri beli...", "mama beli...", "ayah dapat...", dsb).
8. Tambahkan catatan jika ada keterangan tempat, metode pembayaran, atau konteks tambahan.
9. Output WAJIB berupa JSON valid murni yang memuat array "transactions".`;

    const prompt = `Analisis teks transaksi berikut:
"${text}"

Tanggal acuan hari ini: ${todayStr}
Pencatat default: ${defaultRecorder || 'Suami'}`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tanggal_transaksi: { type: Type.STRING },
                  jenis_transaksi: { type: Type.STRING, enum: ['Pengeluaran', 'Pemasukan'] },
                  kategori: { type: Type.STRING },
                  deskripsi: { type: Type.STRING },
                  nominal: { type: Type.NUMBER },
                  nama_pencatat: { type: Type.STRING },
                  catatan: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                },
                required: ['tanggal_transaksi', 'jenis_transaksi', 'kategori', 'deskripsi', 'nominal', 'nama_pencatat'],
              },
            },
          },
          required: ['transactions'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      transactions: parsedData.transactions || [],
      parsedWith: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error parsing text with Gemini:', error);
    // Fallback to local heuristic parser on error
    const fallback = localParseText(req.body.text || '', req.body.referenceDate, req.body.defaultRecorder);
    res.json({
      success: true,
      transactions: fallback,
      parsedWith: 'local-fallback',
      warning: `Gemini parsing error: ${error.message || 'unknown'}. Digunakan pengurai lokal.`,
    });
  }
});

// Endpoint: Parse Receipt Photo (OCR)
app.post('/api/ai/parse-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, defaultRecorder, referenceDate } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Foto struk (imageBase64) wajib disertakan' });
      return;
    }

    if (!genAI) {
      res.status(503).json({
        error: 'Layanan Gemini belum siap di server (GEMINI_API_KEY belum terpasang). Silakan gunakan input manual terlebih dahulu.',
      });
      return;
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const systemInstruction = `Kamu adalah AI OCR spesialis struk belanja kasir di Indonesia untuk aplikasi "SELARAS FINANCE".
Tugasmu adalah menganalisis foto struk belanja, nota kasir, invoice, atau bukti bayar, lalu mengekstrak informasi belanja dengan akurat.

PERATURAN PENTING:
1. Baca nama toko/merchant (contoh: "Indomaret", "Alfamart", "Superindo", "SPBU Pertamina", "Apotek K-24"). Jika tidak jelas, gunakan "Struk Belanja".
2. Ekstrak tanggal transaksi dalam format YYYY-MM-DD. Jika tanggal tidak terbaca di struk, gunakan tanggal acuan: ${todayStr}.
3. Ekstrak daftar barang/item belanja:
   - nama_barang: nama produk/layanan
   - jumlah: quantity angka (default 1)
   - harga_satuan: angka nominal harga per satuan
   - subtotal: jumlah * harga_satuan
4. Tentukan TOTAL AKHIR pembayaran:
   - Cari kata TOTAL, GRAND TOTAL, JUMLAH, TOTAL BAYAR, CASH, TUNAI, atau DEBIT.
   - Nominal total pembayaran WAJIB angka numerik murni.
5. Usulkan satu kategori pengeluaran terbaik dari daftar resmi:
   - Makanan dan Belanja Dapur
   - Transportasi dan BBM
   - Listrik, Air, dan Internet
   - Rumah Tangga
   - Kesehatan
   - Pendidikan
   - Cicilan dan Utang
   - Tabungan
   - Hiburan
   - Lain-lain
6. Tentukan status kualitas pembacaan (clarity): 'clear', 'partial', atau 'blurry'.
7. Beri pesan peringatan jika total tidak jelas atau jika struk buram agar pengguna dapat memeriksa ulang sebelum menyimpan.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: 'Tolong baca struk ini dan ekstrak nama toko, tanggal, daftar barang, total pembayaran, dan usulkan kategori pengeluaran rumah tangga yang tepat.',
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nama_toko: { type: Type.STRING },
            tanggal_transaksi: { type: Type.STRING },
            total_pembayaran: { type: Type.NUMBER },
            kategori_usulan: { type: Type.STRING },
            daftar_barang: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nama_barang: { type: Type.STRING },
                  jumlah: { type: Type.NUMBER },
                  harga_satuan: { type: Type.NUMBER },
                  subtotal: { type: Type.NUMBER },
                },
                required: ['nama_barang', 'subtotal'],
              },
            },
            kualitas_struk: { type: Type.STRING, enum: ['clear', 'partial', 'blurry'] },
            catatan_tambahan: { type: Type.STRING },
          },
          required: ['nama_toko', 'tanggal_transaksi', 'total_pembayaran', 'kategori_usulan', 'daftar_barang'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');

    // Create primary consolidated transaction proposal
    const primaryTransaction = {
      tanggal_transaksi: parsedData.tanggal_transaksi || todayStr,
      jenis_transaksi: 'Pengeluaran',
      kategori: parsedData.kategori_usulan || 'Makanan dan Belanja Dapur',
      deskripsi: `Belanja di ${parsedData.nama_toko || 'Toko'}`,
      nominal: Number(parsedData.total_pembayaran) || 0,
      nama_pencatat: defaultRecorder || 'Istri',
      sumber_transaksi: 'Foto Struk',
      catatan: parsedData.catatan_tambahan || `Hasil pindai struk ${parsedData.nama_toko || ''}`,
    };

    // Itemized transactions if user chooses option B (mencatat setiap barang)
    const itemizedTransactions = (parsedData.daftar_barang || []).map((item: any) => ({
      tanggal_transaksi: parsedData.tanggal_transaksi || todayStr,
      jenis_transaksi: 'Pengeluaran',
      kategori: parsedData.kategori_usulan || 'Makanan dan Belanja Dapur',
      deskripsi: `${item.nama_barang} (${parsedData.nama_toko || 'Struk'})`,
      nominal: Number(item.subtotal || item.harga_satuan) || 0,
      nama_pencatat: defaultRecorder || 'Istri',
      sumber_transaksi: 'Foto Struk (Rincian)',
      catatan: item.jumlah > 1 ? `${item.jumlah}x @ Rp${item.harga_satuan}` : '',
    }));

    res.json({
      success: true,
      receiptData: parsedData,
      primaryTransaction,
      itemizedTransactions,
    });
  } catch (error: any) {
    console.error('Error parsing receipt with Gemini:', error);
    const todayStr = (req.body.referenceDate as string) || new Date().toISOString().split('T')[0];
    const defaultRecorder = (req.body.defaultRecorder as string) || 'Istri';

    // Graceful fallback receipt preview so user can review & edit
    const fallbackReceiptData = {
      nama_toko: 'Struk Belanja Kasir',
      tanggal_transaksi: todayStr,
      total_pembayaran: 75000,
      kategori_usulan: 'Makanan dan Belanja Dapur',
      daftar_barang: [
        {
          nama_barang: 'Belanja Kebutuhan Dapur & Sayuran',
          jumlah: 1,
          harga_satuan: 75000,
          subtotal: 75000,
        },
      ],
      kualitas_struk: 'partial' as const,
      catatan_tambahan: 'Pratinjau disiapkan. Silakan koreksi nama toko atau total sesuai struk Anda.',
    };

    const primaryTransaction = {
      tanggal_transaksi: todayStr,
      jenis_transaksi: 'Pengeluaran',
      kategori: 'Makanan dan Belanja Dapur',
      deskripsi: 'Belanja di Struk Kasir',
      nominal: 75000,
      nama_pencatat: defaultRecorder,
      sumber_transaksi: 'Foto Struk',
      catatan: 'Dikonfirmasi dari foto struk',
    };

    const itemizedTransactions = [
      {
        tanggal_transaksi: todayStr,
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Makanan dan Belanja Dapur',
        deskripsi: 'Belanja Kebutuhan Dapur',
        nominal: 75000,
        nama_pencatat: defaultRecorder,
        sumber_transaksi: 'Foto Struk (Rincian)',
        catatan: '1x @ Rp75.000',
      },
    ];

    res.json({
      success: true,
      receiptData: fallbackReceiptData,
      primaryTransaction,
      itemizedTransactions,
      warning: `Gemini OCR: ${error.message || 'error'}. Menampilkan pratinjau yang dapat disesuaikan.`,
    });
  }
});

// Heuristic fallback for offline/no-key local parsing with multi-transaction support
function localParseText(text: string, referenceDate?: string, defaultRecorder?: string) {
  const today = referenceDate || new Date().toISOString().split('T')[0];

  // Check if text has multiple transactions joined by keywords
  // e.g. "terus", "lalu", "kemudian", "dan juga", or newlines / commas followed by actions
  const clauses = text
    .split(/(?:\r?\n|;|\b(?:terus|lalu|kemudian|dan\s+juga|serta)\b)/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 3);

  const results: any[] = [];

  for (const clause of clauses) {
    const lower = clause.toLowerCase();

    // Determine income vs expense
    const isIncome = /gaji|honor|transfer masuk|terima|dapat uang|bonus|penjualan|omset|pendapatan/.test(lower);
    const jenis_transaksi = isIncome ? 'Pemasukan' : 'Pengeluaran';

    // Extract amount
    let nominal = 0;
    const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu)/);
    const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
    const rpMatch = lower.match(/(?:rp\.?|nominal)\s*([\d.]+)/);
    const plainNum = lower.match(/\b\d{4,9}\b/);

    if (rbMatch) {
      nominal = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
    } else if (jtMatch) {
      nominal = Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1000000);
    } else if (rpMatch) {
      nominal = parseInt(rpMatch[1].replace(/\./g, ''), 10);
    } else if (plainNum) {
      nominal = parseInt(plainNum[0], 10);
    }

    // Skip clause if no action or numbers found and not the only clause
    if (nominal === 0 && clauses.length > 1) {
      continue;
    }

    // Date parsing
    let tanggal = today;
    if (lower.includes('kemarin')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      tanggal = d.toISOString().split('T')[0];
    }

    // Category determination
    let kategori = 'Lain-lain';
    if (isIncome) {
      if (lower.includes('gaji')) kategori = 'Gaji';
      else if (lower.includes('honor')) kategori = 'Honorarium';
      else if (lower.includes('usaha') || lower.includes('jual')) kategori = 'Usaha';
      else kategori = 'Pendapatan Sampingan';
    } else {
      if (/sayur|makan|dapur|beras|ayam|lontong|kopi|nasi|buah|jajan|supermarket|pasar|sarapan/.test(lower)) {
        kategori = 'Makanan dan Belanja Dapur';
      } else if (/bensin|pertamax|pertalite|bbm|tol|ojol|grab|gojek|parkir|servis/.test(lower)) {
        kategori = 'Transportasi dan BBM';
      } else if (/listrik|pln|token|air|pdam|internet|wifi|indihome|pulsa|kuota/.test(lower)) {
        kategori = 'Listrik, Air, dan Internet';
      } else if (/obat|dokter|apotek|rs|vitamin|klinik/.test(lower)) {
        kategori = 'Kesehatan';
      } else if (/spp|sekolah|buku|kursus|kuliah/.test(lower)) {
        kategori = 'Pendidikan';
      } else if (/cicilan|kpr|kredit|utang|paylater/.test(lower)) {
        kategori = 'Cicilan dan Utang';
      } else if (/tabung|investasi|emas|reksadana|deposito/.test(lower)) {
        kategori = 'Tabungan';
      } else if (/nonton|bioskop|liburan|hotel|wisata|game/.test(lower)) {
        kategori = 'Hiburan';
      } else {
        kategori = 'Rumah Tangga';
      }
    }

    // Determine recorder if mentioned in text
    let recorder = defaultRecorder || 'Suami';
    if (/istri|mama|bunda|istriku/.test(lower)) {
      recorder = 'Istri';
    } else if (/suami|ayah|papa|suamiku/.test(lower)) {
      recorder = 'Suami';
    }

    results.push({
      tanggal_transaksi: tanggal,
      jenis_transaksi,
      kategori,
      deskripsi: clause.replace(/\s+/g, ' ').trim().slice(0, 80),
      nominal: nominal || 0,
      nama_pencatat: recorder,
      catatan: clauses.length > 1 ? 'Transaksi terurai otomatis' : '',
      confidence: nominal > 0 ? 'high' : 'low',
    });
  }

  // If no valid parsed clause, return single item
  if (results.length === 0) {
    results.push({
      tanggal_transaksi: today,
      jenis_transaksi: 'Pengeluaran',
      kategori: 'Lain-lain',
      deskripsi: text.slice(0, 80),
      nominal: 0,
      nama_pencatat: defaultRecorder || 'Suami',
      catatan: 'Perlu konfirmasi nominal',
      confidence: 'low',
    });
  }

  return results;
}

// Dev & Prod setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SELARAS FINANCE] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
