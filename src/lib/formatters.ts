/**
 * Utilities for formatting Indonesian Rupiah, Indonesian dates, and transaction IDs
 */

export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');
}

export function formatIndoDate(dateStr: string, options?: { withDay?: boolean; shortMonth?: boolean }): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const shortMonthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

      const monthStr = options?.shortMonth ? shortMonthNames[month] : monthNames[month];
      const dayStr = options?.withDay ? `${dayNames[date.getDay()]}, ` : '';

      return `${dayStr}${day} ${monthStr} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: options?.shortMonth ? 'short' : 'long',
      year: 'numeric',
      weekday: options?.withDay ? 'long' : undefined,
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${shortMonthNames[month]}`;
  }
  return dateStr;
}

export function generateTransactionId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TX-${yyyy}${mm}${dd}-${rand}`;
}

export function parseNumberFromRupiah(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export function getCategoryBadgeColor(kategori: string, jenis: 'Pengeluaran' | 'Pemasukan') {
  if (jenis === 'Pemasukan') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  switch (kategori) {
    case 'Makanan dan Belanja Dapur':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Transportasi dan BBM':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Listrik, Air, dan Internet':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'Rumah Tangga':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Kesehatan':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Pendidikan':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Cicilan dan Utang':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Tabungan':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Hiburan':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
