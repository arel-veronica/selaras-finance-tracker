import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Edit3,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  Plus,
  Trash2,
  Receipt,
  Store,
  DollarSign,
  Calendar,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Transaction, HouseholdSettings, ReceiptOCRResult } from '../types/finance';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../data/categories';
import { formatRupiah, generateTransactionId } from '../lib/formatters';

interface AddTransactionViewProps {
  settings: HouseholdSettings;
  onSaveTransactions: (transactions: Transaction[]) => Promise<void>;
  onNavigateToTransactions: () => void;
}

type TabMode = 'ai-text' | 'ai-receipt' | 'manual';

export const AddTransactionView: React.FC<AddTransactionViewProps> = ({
  settings,
  onSaveTransactions,
  onNavigateToTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('ai-text');

  // --- TAB 1: Natural Language AI State ---
  const [nlText, setNlText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);
  const [textParseError, setTextParseError] = useState<string | null>(null);
  const [parsedPreviewList, setParsedPreviewList] = useState<Transaction[] | null>(null);

  // --- TAB 2: Receipt OCR State ---
  const [receiptImageBase64, setReceiptImageBase64] = useState<string | null>(null);
  const [receiptImageMime, setReceiptImageMime] = useState<string>('image/jpeg');
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [receiptScanError, setReceiptScanError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
  const [receiptOption, setReceiptOption] = useState<'total' | 'itemized'>('total');
  const [receiptPreviewTransactions, setReceiptPreviewTransactions] = useState<Transaction[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TAB 3: Manual Input State ---
  const [manualForm, setManualForm] = useState({
    jenis_transaksi: 'Pengeluaran' as 'Pengeluaran' | 'Pemasukan',
    kategori: DEFAULT_EXPENSE_CATEGORIES[0].nama_kategori,
    deskripsi: '',
    nominal: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    waktu_pencatatan: new Date().toTimeString().split(' ')[0],
    nama_pencatat: settings.pencatat_aktif || 'Suami',
    catatan: '',
  });
  const [manualError, setManualError] = useState<string | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const samplePrompts = [
    'Beli sayur Rp35.000',
    'Beli bensin Rp50.000 tadi pagi',
    'Gaji masuk Rp7.000.000',
    'Bayar listrik Rp450.000 kemarin',
    'Belanja bulanan Rp750.000 di supermarket',
    'Menerima honor mengajar Rp1.500.000',
    'Tadi pagi beli sarapan lontong 25rb terus isi bensin 40rb',
  ];

  // ==========================================
  // HANDLERS FOR TAB 1: AI NATURAL LANGUAGE
  // ==========================================
  const handleParseText = async (customPrompt?: string) => {
    const textToParse = customPrompt !== undefined ? customPrompt : nlText;
    if (!textToParse.trim()) {
      setTextParseError('Silakan masukkan kalimat transaksi terlebih dahulu.');
      return;
    }

    setIsParsingText(true);
    setTextParseError(null);
    setSaveSuccessMessage(null);

    try {
      const res = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToParse,
          referenceDate: new Date().toISOString().split('T')[0],
          defaultRecorder: settings.pencatat_aktif || 'Suami',
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal memproses teks dengan AI');
      }

      const data = await res.json();
      if (!data.transactions || data.transactions.length === 0) {
        throw new Error('AI tidak dapat menemukan data transaksi yang jelas dalam kalimat tersebut.');
      }

      // Map into Transaction objects
      const timeNow = new Date().toTimeString().split(' ')[0];
      const mapped: Transaction[] = data.transactions.map((item: any, idx: number) => ({
        transaction_id: generateTransactionId() + (idx > 0 ? `-${idx + 1}` : ''),
        tanggal_transaksi: item.tanggal_transaksi || new Date().toISOString().split('T')[0],
        waktu_pencatatan: timeNow,
        jenis_transaksi: item.jenis_transaksi || 'Pengeluaran',
        kategori: item.kategori || (item.jenis_transaksi === 'Pemasukan' ? 'Gaji' : 'Lain-lain'),
        deskripsi: item.deskripsi || textToParse,
        nominal: Number(item.nominal) || 0,
        nama_pencatat: item.nama_pencatat || settings.pencatat_aktif || 'Suami',
        sumber_transaksi: 'AI Teks',
        status_konfirmasi: 'Draft',
        catatan: item.catatan || '',
      }));

      setParsedPreviewList(mapped);
    } catch (err: any) {
      console.error(err);
      setTextParseError(err.message || 'Terjadi kesalahan saat memproses kalimat');
    } finally {
      setIsParsingText(false);
    }
  };

  const handleUpdateParsedItem = (index: number, field: keyof Transaction, val: any) => {
    if (!parsedPreviewList) return;
    const updated = [...parsedPreviewList];
    updated[index] = { ...updated[index], [field]: val };
    setParsedPreviewList(updated);
  };

  const handleRemoveParsedItem = (index: number) => {
    if (!parsedPreviewList) return;
    const updated = parsedPreviewList.filter((_, i) => i !== index);
    if (updated.length === 0) {
      setParsedPreviewList(null);
    } else {
      setParsedPreviewList(updated);
    }
  };

  const handleConfirmAndSaveNl = async () => {
    if (!parsedPreviewList || parsedPreviewList.length === 0) return;

    // Validate
    for (const item of parsedPreviewList) {
      if (!item.deskripsi.trim()) {
        setTextParseError('Deskripsi transaksi tidak boleh kosong.');
        return;
      }
      if (item.nominal <= 0) {
        setTextParseError('Nominal transaksi harus lebih dari Rp 0.');
        return;
      }
    }

    setIsSaving(true);
    setTextParseError(null);

    try {
      const finalItems = parsedPreviewList.map((t) => ({
        ...t,
        status_konfirmasi: 'Terkonfirmasi' as const,
      }));
      await onSaveTransactions(finalItems);
      setSaveSuccessMessage(`${finalItems.length} transaksi berhasil disimpan!`);
      setParsedPreviewList(null);
      setNlText('');
    } catch (err: any) {
      setTextParseError(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // HANDLERS FOR TAB 2: RECEIPT OCR
  // ==========================================
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReceiptScanError('File harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReceiptScanError('Ukuran gambar maksimal 10MB.');
      return;
    }

    setReceiptScanError(null);
    setReceiptImageMime(file.type);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setReceiptImageBase64(base64);
      // Auto-trigger scan
      scanReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = async (base64Data: string, mime: string) => {
    setIsScanningReceipt(true);
    setReceiptScanError(null);
    setOcrResult(null);
    setReceiptPreviewTransactions(null);

    try {
      const res = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
          defaultRecorder: settings.pencatat_aktif || 'Istri',
          referenceDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal memindai struk dengan Gemini AI');
      }

      const data = await res.json();
      const ocr: ReceiptOCRResult = data.receiptData;
      setOcrResult(ocr);

      // Setup initial proposed transactions based on default option ('total')
      const timeNow = new Date().toTimeString().split(' ')[0];
      const initialTx: Transaction = {
        transaction_id: generateTransactionId(),
        tanggal_transaksi: ocr.tanggal_transaksi || new Date().toISOString().split('T')[0],
        waktu_pencatatan: timeNow,
        jenis_transaksi: 'Pengeluaran',
        kategori: ocr.kategori_usulan || 'Makanan dan Belanja Dapur',
        deskripsi: `Belanja di ${ocr.nama_toko || 'Struk Belanja'}`,
        nominal: Number(ocr.total_pembayaran) || 0,
        nama_pencatat: settings.pencatat_aktif || 'Istri',
        sumber_transaksi: 'Foto Struk',
        status_konfirmasi: 'Draft',
        catatan: ocr.catatan_tambahan || `Toko: ${ocr.nama_toko || '-'}`,
      };

      setReceiptPreviewTransactions([initialTx]);
    } catch (err: any) {
      console.error(err);
      setReceiptScanError(err.message || 'Gagal memproses foto struk. Pastikan foto terbaca dan terang.');
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleToggleReceiptOption = (option: 'total' | 'itemized') => {
    setReceiptOption(option);
    if (!ocrResult) return;

    const timeNow = new Date().toTimeString().split(' ')[0];
    const today = new Date().toISOString().split('T')[0];

    if (option === 'total') {
      const singleTx: Transaction = {
        transaction_id: generateTransactionId(),
        tanggal_transaksi: ocrResult.tanggal_transaksi || today,
        waktu_pencatatan: timeNow,
        jenis_transaksi: 'Pengeluaran',
        kategori: ocrResult.kategori_usulan || 'Makanan dan Belanja Dapur',
        deskripsi: `Belanja di ${ocrResult.nama_toko || 'Struk Belanja'}`,
        nominal: Number(ocrResult.total_pembayaran) || 0,
        nama_pencatat: settings.pencatat_aktif || 'Istri',
        sumber_transaksi: 'Foto Struk',
        status_konfirmasi: 'Draft',
        catatan: ocrResult.catatan_tambahan || '',
      };
      setReceiptPreviewTransactions([singleTx]);
    } else {
      // Itemized
      const items = ocrResult.daftar_barang || [];
      if (items.length === 0) {
        // Fallback to single if no items parsed
        return;
      }
      const mapped = items.map((item, idx) => ({
        transaction_id: generateTransactionId() + `-${idx + 1}`,
        tanggal_transaksi: ocrResult.tanggal_transaksi || today,
        waktu_pencatatan: timeNow,
        jenis_transaksi: 'Pengeluaran' as const,
        kategori: ocrResult.kategori_usulan || 'Makanan dan Belanja Dapur',
        deskripsi: `${item.nama_barang} (${ocrResult.nama_toko || 'Struk'})`,
        nominal: Number(item.subtotal || item.harga_satuan) || 0,
        nama_pencatat: settings.pencatat_aktif || 'Istri',
        sumber_transaksi: 'Foto Struk (Rincian)' as const,
        status_konfirmasi: 'Draft' as const,
        catatan: item.jumlah > 1 ? `${item.jumlah}x @ Rp${item.harga_satuan}` : '',
      }));
      setReceiptPreviewTransactions(mapped);
    }
  };

  const handleSaveReceiptTransactions = async () => {
    if (!receiptPreviewTransactions || receiptPreviewTransactions.length === 0) return;

    for (const item of receiptPreviewTransactions) {
      if (item.nominal <= 0) {
        setReceiptScanError('Nominal transaksi struk tidak boleh Rp 0. Silakan isi atau koreksi nominal.');
        return;
      }
    }

    setIsSaving(true);
    setReceiptScanError(null);

    try {
      const finalItems = receiptPreviewTransactions.map((t) => ({
        ...t,
        status_konfirmasi: 'Terkonfirmasi' as const,
      }));
      await onSaveTransactions(finalItems);
      setSaveSuccessMessage(`${finalItems.length} transaksi dari struk berhasil disimpan!`);
      setReceiptPreviewTransactions(null);
      setReceiptImageBase64(null);
      setOcrResult(null);
    } catch (err: any) {
      setReceiptScanError(err.message || 'Gagal menyimpan transaksi struk');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // HANDLERS FOR TAB 3: MANUAL INPUT
  // ==========================================
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const nominalNum = parseFloat(manualForm.nominal.replace(/[^\d]/g, ''));
    if (!manualForm.deskripsi.trim()) {
      setManualError('Deskripsi transaksi wajib diisi');
      return;
    }
    if (!nominalNum || nominalNum <= 0) {
      setManualError('Nominal transaksi harus lebih dari Rp 0');
      return;
    }
    if (!manualForm.tanggal_transaksi) {
      setManualError('Tanggal transaksi wajib diisi');
      return;
    }

    setIsSaving(true);

    try {
      const newTx: Transaction = {
        transaction_id: generateTransactionId(),
        tanggal_transaksi: manualForm.tanggal_transaksi,
        waktu_pencatatan: manualForm.waktu_pencatatan || new Date().toTimeString().split(' ')[0],
        jenis_transaksi: manualForm.jenis_transaksi,
        kategori: manualForm.kategori,
        deskripsi: manualForm.deskripsi.trim(),
        nominal: nominalNum,
        nama_pencatat: manualForm.nama_pencatat,
        sumber_transaksi: 'Input Manual',
        status_konfirmasi: 'Terkonfirmasi',
        catatan: manualForm.catatan.trim(),
      };

      await onSaveTransactions([newTx]);
      setSaveSuccessMessage('Transaksi manual berhasil disimpan!');
      setManualForm({
        jenis_transaksi: 'Pengeluaran',
        kategori: DEFAULT_EXPENSE_CATEGORIES[0].nama_kategori,
        deskripsi: '',
        nominal: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        waktu_pencatatan: new Date().toTimeString().split(' ')[0],
        nama_pencatat: settings.pencatat_aktif || 'Suami',
        catatan: '',
      });
    } catch (err: any) {
      setManualError(err.message || 'Gagal menyimpan transaksi manual');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{saveSuccessMessage}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToTransactions}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
            >
              Lihat di Daftar Transaksi <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSaveSuccessMessage(null)}
              className="p-1 text-emerald-600 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-around sm:justify-start gap-2">
        <button
          onClick={() => {
            setActiveTab('ai-text');
            setSaveSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ai-text'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Bahasa Alami (AI)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ai-receipt');
            setSaveSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ai-receipt'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Foto Struk Belanja</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('manual');
            setSaveSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Input Manual</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: BAHASA ALAMI (AI GEMINI)
         ======================================================== */}
      {activeTab === 'ai-text' && (
        <div className="space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Pencatatan dengan Bahasa Alami
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tulis seperti sedang mengobrol atau mengirim chat ke pasangan. AI akan mengekstrak tanggal, nominal, dan kategorinya secara otomatis.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline">
                Pencatat: {settings.pencatat_aktif}
              </span>
            </div>

            {textParseError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{textParseError}</span>
              </div>
            )}

            <div>
              <textarea
                rows={3}
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="Ceritakan transaksi keuanganmu... (contoh: Beli sayur dan daging ayam 75rb di pasar tadi pagi)"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all leading-relaxed"
              />
            </div>

            {/* Quick Chips Examples */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">
                Atau klik contoh kalimat berikut:
              </p>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNlText(prompt);
                      handleParseText(prompt);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200/80 text-slate-700 transition-colors text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Mendukung lebih dari 1 transaksi dalam satu kalimat.
              </span>
              <button
                type="button"
                onClick={() => handleParseText()}
                disabled={isParsingText || !nlText.trim()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                {isParsingText ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menganalisis dengan Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisis Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Parsed Preview Card (User must review and confirm before saving) */}
          {parsedPreviewList && parsedPreviewList.length > 0 && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/40 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Pratinjau Hasil Pembacaan AI ({parsedPreviewList.length} Transaksi)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Silakan periksa dan edit data di bawah jika diperlukan sebelum menekan Simpan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setParsedPreviewList(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Batal
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-4">
                {parsedPreviewList.map((item, index) => {
                  const categories =
                    item.jenis_transaksi === 'Pengeluaran'
                      ? DEFAULT_EXPENSE_CATEGORIES
                      : DEFAULT_INCOME_CATEGORIES;

                  return (
                    <div
                      key={item.transaction_id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Item #{index + 1}
                        </span>
                        {parsedPreviewList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParsedItem(index)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Jenis Transaksi */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Jenis
                          </label>
                          <select
                            value={item.jenis_transaksi}
                            onChange={(e) =>
                              handleUpdateParsedItem(index, 'jenis_transaksi', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          >
                            <option value="Pengeluaran">Pengeluaran</option>
                            <option value="Pemasukan">Pemasukan</option>
                          </select>
                        </div>

                        {/* Nominal */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Nominal (Rp)
                          </label>
                          <input
                            type="number"
                            value={item.nominal}
                            onChange={(e) =>
                              handleUpdateParsedItem(
                                index,
                                'nominal',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          />
                        </div>

                        {/* Kategori */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Kategori
                          </label>
                          <select
                            value={item.kategori}
                            onChange={(e) =>
                              handleUpdateParsedItem(index, 'kategori', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          >
                            {categories.map((c) => (
                              <option key={c.nama_kategori} value={c.nama_kategori}>
                                {c.nama_kategori}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Deskripsi */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Deskripsi
                          </label>
                          <input
                            type="text"
                            value={item.deskripsi}
                            onChange={(e) =>
                              handleUpdateParsedItem(index, 'deskripsi', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                        </div>

                        {/* Tanggal */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Tanggal
                          </label>
                          <input
                            type="date"
                            value={item.tanggal_transaksi}
                            onChange={(e) =>
                              handleUpdateParsedItem(index, 'tanggal_transaksi', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setParsedPreviewList(null)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSaveNl}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Transaksi ({parsedPreviewList.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: FOTO STRUK BELANJA (GEMINI MULTIMODAL OCR)
         ======================================================== */}
      {activeTab === 'ai-receipt' && (
        <div className="space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Pindai Foto Struk Kasir / Nota Belanja
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah atau foto struk belanja supermarket, minimarket, SPBU, atau apotek. Gemini AI akan mengekstrak nama toko, tanggal, rincian barang, dan total bayar.
              </p>
            </div>

            {receiptScanError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{receiptScanError}</span>
              </div>
            )}

            {/* Upload Area */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleReceiptFileChange}
              className="hidden"
            />

            {!receiptImageBase64 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-colors"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Ambil Foto atau Pilih Gambar Struk
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Mendukung format JPG, PNG, WEBP (maksimal 10MB). Pastikan tulisan pada struk cukup jelas dan terang.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Pilih Berkas Struk
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-72 flex items-center justify-center bg-slate-900/5">
                  <img
                    src={receiptImageBase64}
                    alt="Pratinjau Struk"
                    className="max-h-72 w-auto object-contain rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setReceiptImageBase64(null);
                      setOcrResult(null);
                      setReceiptPreviewTransactions(null);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 text-slate-700 hover:text-rose-600 rounded-xl shadow-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Scanning overlay */}
                  {isScanningReceipt && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                      <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm font-bold">Menganalisis Struk dengan Gemini Multimodal...</p>
                      <p className="text-xs text-emerald-200 mt-1">Membaca toko, tanggal, item barang, dan total bayar</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
                  >
                    Ganti Foto Lain
                  </button>
                  <button
                    type="button"
                    onClick={() => scanReceipt(receiptImageBase64, receiptImageMime)}
                    disabled={isScanningReceipt}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Pindai Ulang
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OCR Result & Confirmation Form */}
          {ocrResult && receiptPreviewTransactions && receiptPreviewTransactions.length > 0 && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/40 shadow-md space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-base font-bold text-slate-900">
                      Hasil Pindai: {ocrResult.nama_toko || 'Struk Belanja'}
                    </h4>
                    {ocrResult.kualitas_struk === 'blurry' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Foto Agak Buram
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total terdeteksi: <strong>{formatRupiah(ocrResult.total_pembayaran)}</strong> • Tanggal: {ocrResult.tanggal_transaksi}
                  </p>
                </div>

                {/* Option Toggle: Option A (Total Struk - Disarankan) vs Option B (Per barang) */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleReceiptOption('total')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      receiptOption === 'total'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Total Struk (Disarankan)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleReceiptOption('itemized')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      receiptOption === 'itemized'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rincian Tiap Barang
                  </button>
                </div>
              </div>

              {/* Warning notice if option B */}
              {receiptOption === 'itemized' && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Anda memilih mencatat setiap barang ({receiptPreviewTransactions.length} transaksi terpisah). Pastikan tidak terjadi pencatatan ganda dengan total struk.
                  </span>
                </div>
              )}

              {/* Editable Fields for the Proposed Transactions */}
              <div className="space-y-4">
                {receiptPreviewTransactions.map((tx, idx) => (
                  <div
                    key={tx.transaction_id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{receiptOption === 'total' ? 'Data Transaksi Struk' : `Barang #${idx + 1}`}</span>
                      <span className="text-emerald-700 font-bold">{formatRupiah(tx.nominal)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Deskripsi
                        </label>
                        <input
                          type="text"
                          value={tx.deskripsi}
                          onChange={(e) => {
                            const updated = [...receiptPreviewTransactions];
                            updated[idx].deskripsi = e.target.value;
                            setReceiptPreviewTransactions(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Nominal Total (Rp)
                        </label>
                        <input
                          type="number"
                          value={tx.nominal}
                          onChange={(e) => {
                            const updated = [...receiptPreviewTransactions];
                            updated[idx].nominal = parseInt(e.target.value, 10) || 0;
                            setReceiptPreviewTransactions(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Kategori
                        </label>
                        <select
                          value={tx.kategori}
                          onChange={(e) => {
                            const updated = [...receiptPreviewTransactions];
                            updated[idx].kategori = e.target.value;
                            setReceiptPreviewTransactions(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        >
                          {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                            <option key={c.nama_kategori} value={c.nama_kategori}>
                              {c.nama_kategori}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Tanggal Struk
                        </label>
                        <input
                          type="date"
                          value={tx.tanggal_transaksi}
                          onChange={(e) => {
                            const updated = [...receiptPreviewTransactions];
                            updated[idx].tanggal_transaksi = e.target.value;
                            setReceiptPreviewTransactions(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Dicatat Oleh
                        </label>
                        <select
                          value={tx.nama_pencatat}
                          onChange={(e) => {
                            const updated = [...receiptPreviewTransactions];
                            updated[idx].nama_pencatat = e.target.value;
                            setReceiptPreviewTransactions(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="Istri">👩 Istri</option>
                          <option value="Suami">👨 Suami</option>
                          <option value="Bersama">👥 Bersama</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Itemized Table Breakdown */}
              {ocrResult.daftar_barang && ocrResult.daftar_barang.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                    Rincian Barang Terdeteksi dari Struk ({ocrResult.daftar_barang.length} item)
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {ocrResult.daftar_barang.map((b, bIdx) => (
                      <div key={bIdx} className="px-4 py-2 flex items-center justify-between text-xs">
                        <span className="text-slate-800">
                          {b.nama_barang} {b.jumlah > 1 ? `(${b.jumlah}x)` : ''}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatRupiah(b.subtotal || b.harga_satuan)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReceiptPreviewTransactions(null);
                    setOcrResult(null);
                    setReceiptImageBase64(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveReceiptTransactions}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Transaksi Struk</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: INPUT MANUAL FORM
         ======================================================== */}
      {activeTab === 'manual' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              Input Transaksi Manual
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi data transaksi langsung ke formulir keuangan keluarga.
            </p>
          </div>

          {manualError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Jenis Transaksi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Jenis Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualForm({
                      ...manualForm,
                      jenis_transaksi: 'Pengeluaran',
                      kategori: DEFAULT_EXPENSE_CATEGORIES[0].nama_kategori,
                    });
                  }}
                  className={`py-2.5 px-4 text-sm font-semibold rounded-xl border text-center transition-all ${
                    manualForm.jenis_transaksi === 'Pengeluaran'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pengeluaran (Belanja / Tagihan)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualForm({
                      ...manualForm,
                      jenis_transaksi: 'Pemasukan',
                      kategori: DEFAULT_INCOME_CATEGORIES[0].nama_kategori,
                    });
                  }}
                  className={`py-2.5 px-4 text-sm font-semibold rounded-xl border text-center transition-all ${
                    manualForm.jenis_transaksi === 'Pemasukan'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pemasukan (Gaji / Pendapatan)
                </button>
              </div>
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nominal (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={manualForm.nominal}
                  onChange={(e) => setManualForm({ ...manualForm, nominal: e.target.value })}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi Transaksi
              </label>
              <input
                type="text"
                value={manualForm.deskripsi}
                onChange={(e) => setManualForm({ ...manualForm, deskripsi: e.target.value })}
                placeholder="Contoh: Belanja bahan pokok di pasar, bensin pertamax, atau gaji bulanan"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kategori
                </label>
                <select
                  value={manualForm.kategori}
                  onChange={(e) => setManualForm({ ...manualForm, kategori: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  {(manualForm.jenis_transaksi === 'Pengeluaran'
                    ? DEFAULT_EXPENSE_CATEGORIES
                    : DEFAULT_INCOME_CATEGORIES
                  ).map((c) => (
                    <option key={c.nama_kategori} value={c.nama_kategori}>
                      {c.nama_kategori}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={manualForm.tanggal_transaksi}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, tanggal_transaksi: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pencatat */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Dicatat Oleh
                </label>
                <select
                  value={manualForm.nama_pencatat}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, nama_pencatat: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value={settings.nama_suami || 'Suami'}>👨 {settings.nama_suami || 'Suami'}</option>
                  <option value={settings.nama_istri || 'Istri'}>👩 {settings.nama_istri || 'Istri'}</option>
                  <option value="Bersama">👥 Bersama</option>
                </select>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={manualForm.catatan}
                  onChange={(e) => setManualForm({ ...manualForm, catatan: e.target.value })}
                  placeholder="Lokasi, toko, atau info pelengkap"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setManualForm({
                    jenis_transaksi: 'Pengeluaran',
                    kategori: DEFAULT_EXPENSE_CATEGORIES[0].nama_kategori,
                    deskripsi: '',
                    nominal: '',
                    tanggal_transaksi: new Date().toISOString().split('T')[0],
                    waktu_pencatatan: new Date().toTimeString().split(' ')[0],
                    nama_pencatat: settings.pencatat_aktif || 'Suami',
                    catatan: '',
                  })
                }
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-xs flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Transaksi Manual</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
