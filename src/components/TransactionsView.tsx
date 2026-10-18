import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Camera,
  Edit3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Transaction, HouseholdSettings } from '../types/finance';
import { formatRupiah, formatIndoDate, getCategoryBadgeColor } from '../lib/formatters';
import { ALL_DEFAULT_CATEGORIES } from '../data/categories';

interface TransactionsViewProps {
  transactions: Transaction[];
  settings: HouseholdSettings;
  onEdit: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  onAddNew: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  settings,
  onEdit,
  onDeleteRequest,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Pengeluaran' | 'Pemasukan'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRecorder, setFilterRecorder] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered and sorted transactions
  const filteredList = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchDesc = tx.deskripsi.toLowerCase().includes(term);
          const matchCat = tx.kategori.toLowerCase().includes(term);
          const matchNotes = (tx.catatan || '').toLowerCase().includes(term);
          const matchRecorder = tx.nama_pencatat.toLowerCase().includes(term);
          if (!matchDesc && !matchCat && !matchNotes && !matchRecorder) return false;
        }

        // Type filter
        if (filterType !== 'all' && tx.jenis_transaksi !== filterType) {
          return false;
        }

        // Category filter
        if (filterCategory !== 'all' && tx.kategori !== filterCategory) {
          return false;
        }

        // Recorder filter
        if (filterRecorder !== 'all' && tx.nama_pencatat !== filterRecorder) {
          return false;
        }

        // Source filter
        if (filterSource !== 'all' && tx.sumber_transaksi !== filterSource) {
          return false;
        }

        // Date range
        if (startDate && tx.tanggal_transaksi < startDate) {
          return false;
        }
        if (endDate && tx.tanggal_transaksi > endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return `${b.tanggal_transaksi} ${b.waktu_pencatatan}`.localeCompare(
            `${a.tanggal_transaksi} ${a.waktu_pencatatan}`
          );
        }
        if (sortBy === 'date-asc') {
          return `${a.tanggal_transaksi} ${a.waktu_pencatatan}`.localeCompare(
            `${b.tanggal_transaksi} ${b.waktu_pencatatan}`
          );
        }
        if (sortBy === 'amount-desc') {
          return b.nominal - a.nominal;
        }
        if (sortBy === 'amount-asc') {
          return a.nominal - b.nominal;
        }
        return 0;
      });
  }, [
    transactions,
    searchTerm,
    filterType,
    filterCategory,
    filterRecorder,
    filterSource,
    startDate,
    endDate,
    sortBy,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterRecorder('all');
    setFilterSource('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  const getSourceIcon = (source: string) => {
    if (source.includes('AI') || source.includes('Teks')) {
      return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (source.includes('Struk')) {
      return <Camera className="w-3.5 h-3.5 text-blue-600" />;
    }
    return <Edit3 className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Riwayat Transaksi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {filteredList.length} transaksi ditemukan ({transactions.length} transaksi tersimpan)
          </p>
        </div>

        <button
          onClick={onAddNew}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
        >
          <span>+ Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari deskripsi, kategori, toko, atau catatan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="date-desc">Urutkan: Tanggal Terbaru</option>
              <option value="date-asc">Urutkan: Tanggal Terlama</option>
              <option value="amount-desc">Urutkan: Nominal Terbesar</option>
              <option value="amount-asc">Urutkan: Nominal Terkecil</option>
            </select>
          </div>
        </div>

        {/* Detailed Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Filter Jenis */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Jenis
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Jenis</option>
              <option value="Pengeluaran">Pengeluaran</option>
              <option value="Pemasukan">Pemasukan</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Kategori</option>
              {ALL_DEFAULT_CATEGORIES.map((c) => (
                <option key={c.nama_kategori} value={c.nama_kategori}>
                  {c.nama_kategori}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pencatat */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Pencatat
            </label>
            <select
              value={filterRecorder}
              onChange={(e) => {
                setFilterRecorder(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Pencatat</option>
              <option value={settings.nama_suami || 'Suami'}>👨 {settings.nama_suami || 'Suami'}</option>
              <option value={settings.nama_istri || 'Istri'}>👩 {settings.nama_istri || 'Istri'}</option>
            </select>
          </div>

          {/* Filter Sumber */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Sumber Input
            </label>
            <select
              value={filterSource}
              onChange={(e) => {
                setFilterSource(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">Semua Sumber</option>
              <option value="AI Teks">AI Teks</option>
              <option value="Foto Struk">Foto Struk</option>
              <option value="Input Manual">Input Manual</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rentang:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
          </div>

          {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterRecorder !== 'all' || filterSource !== 'all' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-emerald-700 underline font-medium"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Transactions Data View: Table on Desktop, Cards on Mobile */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Tidak ada transaksi ditemukan</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ada transaksi yang sesuai dengan kata kunci atau filter pencarian saat ini.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Bersihkan Filter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Jenis</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Deskripsi</th>
                  <th className="py-3.5 px-4">Pencatat</th>
                  <th className="py-3.5 px-4">Sumber</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Tanggal */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      <div>{formatIndoDate(tx.tanggal_transaksi, { shortMonth: true })}</div>
                      <div className="text-[10px] text-slate-400">{tx.waktu_pencatatan}</div>
                    </td>

                    {/* Jenis */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          tx.jenis_transaksi === 'Pemasukan'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {tx.jenis_transaksi === 'Pemasukan' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {tx.jenis_transaksi}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${getCategoryBadgeColor(
                          tx.kategori,
                          tx.jenis_transaksi
                        )}`}
                      >
                        {tx.kategori}
                      </span>
                    </td>

                    {/* Deskripsi */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 max-w-xs truncate">
                        {tx.deskripsi}
                      </div>
                      {tx.catatan && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {tx.catatan}
                        </div>
                      )}
                    </td>

                    {/* Pencatat */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {tx.nama_pencatat === 'Suami' ? '👨 Suami' : tx.nama_pencatat === 'Istri' ? '👩 Istri' : tx.nama_pencatat}
                    </td>

                    {/* Sumber */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        {getSourceIcon(tx.sumber_transaksi)}
                        <span>{tx.sumber_transaksi}</span>
                      </div>
                    </td>

                    {/* Nominal */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-sm">
                      <span
                        className={
                          tx.jenis_transaksi === 'Pemasukan' ? 'text-emerald-700' : 'text-slate-900'
                        }
                      >
                        {tx.jenis_transaksi === 'Pemasukan' ? '+' : '-'}
                        {formatRupiah(tx.nominal)}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(tx)}
                          title="Edit Transaksi"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRequest(tx)}
                          title="Hapus Transaksi"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden divide-y divide-slate-100">
            {paginatedTransactions.map((tx) => (
              <div key={tx.transaction_id} className="p-4 hover:bg-slate-50/70 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryBadgeColor(
                        tx.kategori,
                        tx.jenis_transaksi
                      )}`}
                    >
                      {tx.kategori}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {tx.deskripsi}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold ${
                        tx.jenis_transaksi === 'Pemasukan' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {tx.jenis_transaksi === 'Pemasukan' ? '+' : '-'}
                      {formatRupiah(tx.nominal)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <span>{formatIndoDate(tx.tanggal_transaksi, { shortMonth: true })}</span>
                    <span>•</span>
                    <span>Oleh: {tx.nama_pencatat}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1 text-slate-500 hover:text-emerald-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRequest(tx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
                >
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
