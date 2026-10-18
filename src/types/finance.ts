export type TransactionType = 'Pengeluaran' | 'Pemasukan';

export type InputSource = 'AI Teks' | 'Foto Struk' | 'Input Manual' | 'Foto Struk (Rincian)';

export interface Transaction {
  transaction_id: string;
  tanggal_transaksi: string; // YYYY-MM-DD
  waktu_pencatatan: string; // HH:mm:ss
  jenis_transaksi: TransactionType;
  kategori: string;
  deskripsi: string;
  nominal: number;
  nama_pencatat: string; // 'Suami' | 'Istri' | custom
  sumber_transaksi: InputSource;
  status_konfirmasi: 'Terkonfirmasi' | 'Draft';
  catatan?: string;
  sheetRowIndex?: number; // Row index in Google Sheets for update/delete
}

export interface CategoryItem {
  nama_kategori: string;
  jenis_transaksi: TransactionType;
  status_aktif: boolean;
  warna?: string;
  ikon?: string;
}

export interface ReceiptItem {
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

export interface ReceiptOCRResult {
  nama_toko: string;
  tanggal_transaksi: string;
  total_pembayaran: number;
  kategori_usulan: string;
  daftar_barang: ReceiptItem[];
  kualitas_struk: 'clear' | 'partial' | 'blurry';
  catatan_tambahan?: string;
}

export interface HouseholdSettings {
  nama_rumah_tangga: string;
  nama_suami: string;
  nama_istri: string;
  pencatat_aktif: string;
  mata_uang: string;
  app_mode: 'demo' | 'production';
  spreadsheet_id?: string;
  spreadsheet_name?: string;
}

export interface GoogleAuthState {
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: string | null;
  errorMessage: string | null;
}

export type FilterPeriod = 'today' | '7days' | 'this_month' | 'last_month' | 'custom';
