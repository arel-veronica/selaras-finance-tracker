import { CategoryItem } from '../types/finance';

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  { nama_kategori: 'Makanan dan Belanja Dapur', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'amber' },
  { nama_kategori: 'Transportasi dan BBM', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'blue' },
  { nama_kategori: 'Listrik, Air, dan Internet', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'cyan' },
  { nama_kategori: 'Rumah Tangga', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'emerald' },
  { nama_kategori: 'Kesehatan', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'rose' },
  { nama_kategori: 'Pendidikan', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'purple' },
  { nama_kategori: 'Cicilan dan Utang', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'red' },
  { nama_kategori: 'Tabungan', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'teal' },
  { nama_kategori: 'Hiburan', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'indigo' },
  { nama_kategori: 'Lain-lain', jenis_transaksi: 'Pengeluaran', status_aktif: true, warna: 'gray' },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { nama_kategori: 'Gaji', jenis_transaksi: 'Pemasukan', status_aktif: true, warna: 'emerald' },
  { nama_kategori: 'Usaha', jenis_transaksi: 'Pemasukan', status_aktif: true, warna: 'blue' },
  { nama_kategori: 'Honorarium', jenis_transaksi: 'Pemasukan', status_aktif: true, warna: 'violet' },
  { nama_kategori: 'Pendapatan Sampingan', jenis_transaksi: 'Pemasukan', status_aktif: true, warna: 'teal' },
  { nama_kategori: 'Lain-lain', jenis_transaksi: 'Pemasukan', status_aktif: true, warna: 'gray' },
];

export const ALL_DEFAULT_CATEGORIES: CategoryItem[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
