import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Transaction, FilterPeriod, HouseholdSettings } from '../types/finance';
import { formatRupiah, formatIndoDate, getCategoryBadgeColor } from '../lib/formatters';

interface DashboardViewProps {
  transactions: Transaction[];
  settings: HouseholdSettings;
  onNavigate: (tab: string) => void;
  onOpenEditModal: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  settings,
  onNavigate,
  onOpenEditModal,
}) => {
  const [period, setPeriod] = useState<FilterPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate current dates for comparison
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter transactions based on period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return transactions.filter((tx) => {
      const txDate = new Date(tx.tanggal_transaksi);
      const txDateStr = tx.tanggal_transaksi;

      if (period === 'today') {
        return txDateStr === todayStr;
      }
      if (period === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return txDate >= sevenDaysAgo && txDateStr <= todayStr;
      }
      if (period === 'this_month') {
        return (
          txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth
        );
      }
      if (period === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return (
          txDate.getFullYear() === lastMonthYear && txDate.getMonth() === lastMonth
        );
      }
      if (period === 'custom') {
        if (customStartDate && txDateStr < customStartDate) return false;
        if (customEndDate && txDateStr > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [transactions, period, todayStr, customStartDate, customEndDate]);

  // Aggregate metrics
  const { totalIncome, totalExpense, balance, txCount, expenseByCategory, dailyCashflow } =
    useMemo(() => {
      let income = 0;
      let expense = 0;
      const catMap: Record<string, number> = {};
      const dayMap: Record<string, { income: number; expense: number }> = {};

      filteredTransactions.forEach((tx) => {
        if (tx.jenis_transaksi === 'Pemasukan') {
          income += tx.nominal;
        } else {
          expense += tx.nominal;
          catMap[tx.kategori] = (catMap[tx.kategori] || 0) + tx.nominal;
        }

        const d = tx.tanggal_transaksi;
        if (!dayMap[d]) {
          dayMap[d] = { income: 0, expense: 0 };
        }
        if (tx.jenis_transaksi === 'Pemasukan') {
          dayMap[d].income += tx.nominal;
        } else {
          dayMap[d].expense += tx.nominal;
        }
      });

      // Sort categories by expenditure
      const catList = Object.entries(catMap)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: expense > 0 ? (amount / expense) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Sort daily cashflow
      const days = Object.keys(dayMap)
        .sort()
        .map((d) => ({
          date: d,
          ...dayMap[d],
        }));

      return {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        txCount: filteredTransactions.length,
        expenseByCategory: catList,
        dailyCashflow: days,
      };
    }, [filteredTransactions]);

  // Savings rate calculation
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0;

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const d1 = `${a.tanggal_transaksi} ${a.waktu_pencatatan}`;
        const d2 = `${b.tanggal_transaksi} ${b.waktu_pencatatan}`;
        return d2.localeCompare(d1);
      })
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Demo Warning Banner if in Demo mode */}
      {settings.app_mode === 'demo' && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 tracking-wide">
                  MODE DEMO
                </span>
                <h4 className="text-sm font-semibold text-amber-900">
                  Data Contoh Keluarga Aktif
                </h4>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Data keuangan di bawah adalah simulasi. Anda dapat menambah, mengubah, atau menghubungkan Google Sheets Anda kapan saja.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shrink-0 shadow-xs"
          >
            Hubungkan Sheets
          </button>
        </div>
      )}

      {/* Top Banner & Quick AI Action */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold tracking-wide backdrop-blur-xs">
                {settings.nama_rumah_tangga || 'Keluarga Harmonis'}
              </span>
              <span className="text-xs text-emerald-100">
                Pencatat aktif: <strong>{settings.pencatat_aktif}</strong>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat datang di Selaras Finance
            </h2>
            <p className="text-sm text-emerald-100 mt-1 leading-relaxed">
              Catat pengeluaran belanja sayur, bensin, atau listrik hanya dengan mengetik bahasa sehari-hari atau foto struk kasir.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('add-transaction')}
              className="w-full sm:w-auto px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Catat dengan AI Cerdas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Periode:
          </span>
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              period === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              period === '7days'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              period === 'this_month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod('last_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              period === 'last_month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bulan Sebelumnya
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              period === 'custom'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rentang Khusus
          </button>
        </div>

        {/* Custom Date Inputs if selected */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-700"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-700"
            />
          </div>
        )}
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pemasukan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pemasukan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(totalIncome)}
          </div>
          <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
            <span>+{filteredTransactions.filter((t) => t.jenis_transaksi === 'Pemasukan').length} transaksi masuk</span>
          </p>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pengeluaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(totalExpense)}
          </div>
          <p className="mt-2 text-xs text-rose-700 flex items-center gap-1 font-medium">
            <span>{filteredTransactions.filter((t) => t.jenis_transaksi === 'Pengeluaran').length} transaksi belanja</span>
          </p>
        </div>

        {/* Selisih / Saldo Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Selisih / Sisa Kas
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                balance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              balance >= 0 ? 'text-teal-700' : 'text-rose-600'
            }`}
          >
            {formatRupiah(balance)}
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            {balance >= 0 ? (
              <span className="text-teal-700 font-semibold">Surplus Keuangan Aman</span>
            ) : (
              <span className="text-rose-600 font-semibold">Defisit (Pengeluaran Lebih Besar)</span>
            )}
          </p>
        </div>

        {/* Tingkat Tabungan & Total Transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rasio Tabungan & Transaksi
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {savingsRate}%
            </span>
            <span className="text-xs text-slate-500">tabungan bersih</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            Total {txCount} transaksi tercatat
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Timeline / Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Tren Arus Kas (Pemasukan vs Pengeluaran)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pergerakan harian dalam periode terpilih
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Masuk
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Keluar
              </span>
            </div>
          </div>

          {dailyCashflow.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs">Belum ada transaksi di rentang tanggal ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily bars representation */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {dailyCashflow.map((day) => {
                  const maxDayVal = Math.max(day.income, day.expense, 1);
                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>{formatIndoDate(day.date, { shortMonth: true })}</span>
                        <div className="flex items-center gap-3">
                          {day.income > 0 && (
                            <span className="text-emerald-700 font-semibold">
                              +{formatRupiah(day.income)}
                            </span>
                          )}
                          {day.expense > 0 && (
                            <span className="text-rose-600 font-semibold">
                              -{formatRupiah(day.expense)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                        <div className="flex justify-end">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (day.income / (totalIncome || 1)) * 100 * 2)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-start">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (day.expense / (totalExpense || 1)) * 100 * 2)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Pengeluaran: {formatRupiah(totalExpense)}</span>
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                >
                  Lihat Rekap Lengkap <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pengeluaran Berdasarkan Kategori (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" />
                  Kategori Terbesar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Pos belanja keluarga utama</p>
              </div>
            </div>

            {expenseByCategory.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <PieIcon className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
                <p className="text-xs">Belum ada pengeluaran di periode ini.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {expenseByCategory.slice(0, 6).map((cat, idx) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {idx + 1}. {cat.name}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          {formatRupiah(cat.amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(4, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-2 text-xs font-semibold text-center text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Lihat Analisis Kategori Detail
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Transaksi Terbaru</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan belanja dan pemasukan terkini keluarga
            </p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
          >
            Lihat Semua Transaksi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">Belum ada transaksi tersimpan.</p>
            <button
              onClick={() => onNavigate('add-transaction')}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
            >
              Mulai Catat Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div
                key={tx.transaction_id}
                onClick={() => onOpenEditModal(tx)}
                className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.jenis_transaksi === 'Pemasukan'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {tx.jenis_transaksi === 'Pemasukan' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {tx.deskripsi}
                      </h4>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${getCategoryBadgeColor(
                          tx.kategori,
                          tx.jenis_transaksi
                        )}`}
                      >
                        {tx.kategori}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{formatIndoDate(tx.tanggal_transaksi, { shortMonth: true })}</span>
                      <span>•</span>
                      <span>Oleh: {tx.nama_pencatat}</span>
                      <span>•</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                        {tx.sumber_transaksi}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-sm sm:text-base font-bold ${
                      tx.jenis_transaksi === 'Pemasukan' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {tx.jenis_transaksi === 'Pemasukan' ? '+' : '-'}
                    {formatRupiah(tx.nominal)}
                  </div>
                  <span className="text-[10px] text-slate-400">Klik untuk edit</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
