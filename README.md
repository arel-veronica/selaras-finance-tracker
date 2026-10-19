# SELARAS FINANCE 🌿
> *"Keuangan tertata, rumah tangga lebih tenang."*

Aplikasi web pencatatan dan pengelolaan keuangan rumah tangga modern yang dirancang khusus untuk pasangan suami istri. Mempermudah pencatatan pemasukan dan pengeluaran harian menggunakan bahasa percakapan sehari-hari (AI Natural Language) atau foto struk kasir (Multimodal OCR), terintegrasi langsung dengan **Google Sheets** sebagai basis data cloud keluarga.

---

## ✨ Fitur Utama

### 1. 📊 Dashboard Keuangan Interaktif
- **Ringkasan Arus Kas**: Total Pemasukan, Total Pengeluaran, Selisih Kas Bersih (*Surplus/Defisit*), dan Rasio Tabungan.
- **Filter Periode Dinamis**: Hari Ini, 7 Hari Terakhir, Bulan Ini, Bulan Sebelumnya, dan Rentang Tanggal Khusus.
- **Grafik Tren Arus Kas**: Perbandingan visual harian antara uang masuk dan uang keluar.
- **Distribusi Kategori Belanja**: Peringkat pos pengeluaran terbesar lengkap dengan nominal dan persentase.
- **Riwayat Terkini**: Menampilkan 5 transaksi paling baru dengan akses cepat untuk melihat atau mengubah.

### 2. 💬 Pencatatan Melalui Bahasa Alami (Gemini AI)
- Masukkan transaksi semudah berkirim pesan singkat:
  - *"Beli sayur Rp35.000"*
  - *"Beli bensin Rp50.000 tadi pagi"*
  - *"Gaji masuk Rp7.000.000"*
  - *"Bayar listrik Rp450.000 kemarin"*
  - *"Tadi pagi beli sarapan lontong 25rb terus isi bensin 40rb"* *(multi-transaksi terurai otomatis!)*
- AI mengekstrak **tanggal**, **nominal**, **jenis transaksi** (Pemasukan/Pengeluaran), **kategori**, **deskripsi**, dan **nama pencatat**.
- **Pratinjau Sebelum Simpan**: Seluruh data yang diurai dapat diperiksa dan diedit terlebih dahulu sebelum menekan tombol Simpan.

### 3. 📸 Pemindai Foto Struk Kasir (Gemini Multimodal OCR)
- Unggah atau foto langsung struk belanja (Indomaret, Alfamart, Superindo, SPBU, apotek, restoran, dsb.).
- AI membaca nama toko/merchant, tanggal belanja, daftar rincian barang, dan total pembayaran.
- Dua opsi fleksibel:
  - **Opsi A: Total Struk (Disarankan)** — mencatat 1 pengeluaran sesuai total struk agar tidak terjadi penghitungan ganda.
  - **Opsi B: Rincian Tiap Barang** — memecah setiap barang belanjaan menjadi transaksi tersendiri.
- Formulir konfirmasi yang dapat disesuaikan sebelum data disimpan.

### 4. 📋 Pengelolaan & Riwayat Transaksi Lengkap
- **Pencarian Cepat**: Berdasarkan deskripsi, kategori, toko, pencatat, atau catatan.
- **Multi-Filter**: Filter jenis transaksi (Pemasukan/Pengeluaran), kategori, pencatat (Suami/Istri), sumber input, dan tanggal.
- **Pengurutan Fleksibel**: Urutkan berdasarkan tanggal terbaru/terlama atau nominal terbesar/terkecil.
- **Aksi Aman**: Edit data transaksi dan hapus transaksi dengan dialog konfirmasi aman.
- **Paginasi Bersih**: Tampilan tabel di layar desktop dan kartu elegan di smartphone.

### 5. 📈 Laporan & Rekapitulasi Keuangan
- **Rekap Harian**: Tabel arus kas per hari (pemasukan, pengeluaran, saldo bersih).
- **Perbandingan Antarbulan (Month-over-Month)**: Evaluasi pertumbuhan pendapatan dan pengeluaran dibanding bulan sebelumnya.
- **Analisis Porsi Kategori**: Melihat alokasi anggaran belanja keluarga secara transparan.
- **Transparansi Pasangan**: Menampilkan komparasi pengeluaran dan pemasukan yang dicatat oleh Suami vs Istri.
- **Ekspor CSV**: Unduh laporan transaksi lengkap dalam format CSV yang kompatibel dengan Microsoft Excel atau Google Sheets.

### 6. 📂 Integrasi Google Sheets & Mode Demo
- **Mode Demo**: Prototipe dapat langsung diuji coba dengan data contoh realistis tanpa memerlukan login akun Google. Data disimpan sementara di sesi browser lokal.
- **Mode Produksi (Google Sheets)**: Menggunakan autentikasi Google Workspace OAuth 2.0 resmi (Firebase Auth). Aplikasi akan secara otomatis mencari atau membuat spreadsheet di Google Drive pengguna:
  - **Sheet `TRANSAKSI`**: Menyimpan seluruh riwayat transaksi.
  - **Sheet `KATEGORI`**: Menyimpan daftar kategori resmi keluarga.
- Sinkronisasi CRUD dua arah (*Create, Read, Update, Delete*).

---

## 🏗️ Arsitektur Teknologi

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4 | Antarmuka responsif, modern, human-centered |
| **Komponen & Ikon** | Lucide React | Ikonografi yang konsisten dan minimalis |
| **Backend & Proxy** | Express.js, TypeScript (`server.ts`) | Mengamankan API key dan melayani Vite middleware |
| **AI NLP & OCR** | Google Gemini API (`@google/genai`) | Model `gemini-3.8-flash` untuk pemahaman teks & foto struk |
| **Autentikasi** | Firebase Auth (Google Auth Provider) | OAuth 2.0 dengan token akses in-memory aman |
| **Penyimpanan Cloud**| Google Sheets API v4 & Google Drive API v3 | Spreadsheet keluarga sebagai basis data utama |

---

## 📑 Struktur Spreadsheet Google Sheets

Ketika terhubung ke akun Google, Selaras Finance mengelola satu spreadsheet bernama **`Selaras Finance - Catatan Keuangan Keluarga`** dengan dua lembar (*sheet*):

### 1. Sheet: `TRANSAKSI`
| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `transaction_id` | String | ID unik transaksi (contoh: `TX-20261018-AB12`) |
| `tanggal_transaksi` | Date (YYYY-MM-DD) | Tanggal transaksi berlangsung |
| `waktu_pencatatan` | Time (HH:mm:ss) | Waktu pencatatan transaksi |
| `jenis_transaksi` | String | `Pengeluaran` atau `Pemasukan` |
| `kategori` | String | Kategori resmi anggaran |
| `deskripsi` | String | Keterangan transaksi |
| `nominal` | Number | Jumlah uang dalam mata uang Rupiah |
| `nama_pencatat` | String | Suami, Istri, atau Bersama |
| `sumber_transaksi` | String | `AI Teks`, `Foto Struk`, atau `Input Manual` |
| `status_konfirmasi` | String | `Terkonfirmasi` atau `Draft` |

### 2. Sheet: `KATEGORI`
| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `nama_kategori` | String | Nama kategori (misal: *Makanan dan Belanja Dapur*) |
| `jenis_transaksi` | String | `Pengeluaran` atau `Pemasukan` |
| `status_aktif` | String | `AKTIF` atau `NONAKTIF` |

---

## 🏷️ Kategori Standar

### Kategori Pengeluaran:
1. Makanan dan Belanja Dapur
2. Transportasi dan BBM
3. Listrik, Air, dan Internet
4. Rumah Tangga
5. Kesehatan
6. Pendidikan
7. Cicilan dan Utang
8. Tabungan
9. Hiburan
10. Lain-lain

### Kategori Pemasukan:
1. Gaji
2. Usaha
3. Honorarium
4. Pendapatan Sampingan
5. Lain-lain

*(Kategori tambahan dapat disesuaikan di menu Pengaturan).*

---

## 🚀 Menjalankan Aplikasi Secara Lokal

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 ke atas
- Kunci API Google Gemini (dapat diperoleh dari [Google AI Studio](https://aistudio.google.com/))

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env` lalu isi kredensial yang diperlukan:
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan di: **`http://localhost:3000`**

### 5. Memeriksa Tipe & Membangun untuk Produksi
```bash
npm run lint    # Memeriksa TypeScript syntax tanpa error
npm run build   # Membangun bundle statis untuk produksi
npm start       # Menjalankan server produksi
```

---

## 🔒 Keamanan & Privasi
- **Zero API Key Leakage**: Kunci Gemini API dikelola secara ketat pada server backend (`server.ts`) dan tidak pernah dikirimkan ke peramban (*client browser*).
- **In-Memory Token Cache**: Token akses Google Workspace OAuth disimpan di memori kerja aplikasi (*in-memory*) dan tidak disimpan di `localStorage` atau `sessionStorage`.
- **Pemisahan Mode Data**: Data Mode Demo dipisahkan secara terisolasi dari Google Sheets agar data pengujian tidak mencemari pembukuan riil keluarga.
- **Konfirmasi Transaksi**: Tidak ada transaksi yang disimpan otomatis tanpa konfirmasi pengguna, dan penghapusan data selalu meminta konfirmasi eksplisit (*destructive action safety*).

---

© 2026 SELARAS FINANCE — Dibuat untuk keharmonisan dan ketenangan finansial keluarga.
