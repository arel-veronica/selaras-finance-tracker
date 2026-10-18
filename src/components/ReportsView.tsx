import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import { Transaction, HouseholdSettings } from '../types/finance';
import { formatRupiah, formatIndoDate, getCategoryBadgeColor } from '../lib/formatters';

interface ReportsViewProps {
  transactions: Transaction[];
  settings: HouseholdSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, settings }) => {
  // Available report periods
  const [reportPeriod, setReportPeriod] = useState<'this_month' | 'last_month' | 'all'>('this_month');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Filtered transactions for the selected report period
  const reportTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.tanggal_transaksi);
      if (reportPeriod === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (reportPeriod === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
      }
      return true;
    });
  }, [transactions, reportPeriod, currentYear, currentMonth]);

  // Aggregate current period
  const {
    totalIncome,
    totalExpense,
    netBalance,
    dailyBreakdown,
    categoryBreakdown,
    recorderBreakdown,
    dailyAvgExpense,
  } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};
    const recMap: Record<string, { income: number; expense: number }> = {};
    const dayMap: Record<string, { income: number; expense: number; count: number }> = {};

    reportTransactions.forEach((tx) => {
      const d = tx.tanggal_transaksi;
      if (!dayMap[d]) {
        dayMap[d] = { income: 0, expense: 0, count: 0 };
      }
      dayMap[d].count += 1;

      const rec = tx.nama_pencatat || 'Lainnya';
      if (!recMap[rec]) {
        recMap[rec] = { income: 0, expense: 0 };
      }

      if (tx.jenis_transaksi === 'Pemasukan') {
        income += tx.nominal;
        dayMap[d].income += tx.nominal;
        recMap[rec].income += tx.nominal;
      } else {
        expense += tx.nominal;
        dayMap[d].expense += tx.nominal;
        recMap[rec].expense += tx.nominal;
        catMap[tx.kategori] = (catMap[tx.kategori] || 0) + tx.nominal;
      }
    });

    const catList = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: expense > 0 ? (amount / expense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const dayList = Object.entries(dayMap)
      .map(([date, data]) => ({
        date,
        ...data,
        net: data.income - data.expense,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const distinctDays = Object.keys(dayMap).length || 1;
    const avgExpense = Math.round(expense / distinctDays);

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      dailyBreakdown: dayList,
      categoryBreakdown: catList,
      recorderBreakdown: recMap,
      dailyAvgExpense: avgExpense,
    };
  }, [reportTransactions]);

  // Month-over-Month comparison data (This Month vs Last Month)
  const momComparison = useMemo(() => {
    const thisMonthTx = transactions.filter((tx) => {
      const d = new Date(tx.tanggal_transaksi);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthTx = transactions.filter((tx) => {
      const d = new Date(tx.tanggal_transaksi);
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    });

    const thisIncome = thisMonthTx
      .filter((t) => t.jenis_transaksi === 'Pemasukan')
      .reduce((s, t) => s + t.nominal, 0);
    const thisExpense = thisMonthTx
      .filter((t) => t.jenis_transaksi === 'Pengeluaran')
      .reduce((s, t) => s + t.nominal, 0);

    const lastIncome = lastMonthTx
      .filter((t) => t.jenis_transaksi === 'Pemasukan')
      .reduce((s, t) => s + t.nominal, 0);
    const lastExpense = lastMonthTx
      .filter((t) => t.jenis_transaksi === 'Pengeluaran')
      .reduce((s, t) => s + t.nominal, 0);

    const incomeDiff = thisIncome - lastIncome;
    const incomeGrowth = lastIncome > 0 ? (incomeDiff / lastIncome) * 100 : 0;

    const expenseDiff = thisExpense - lastExpense;
    const expenseGrowth = lastExpense > 0 ? (expenseDiff / lastExpense) * 100 : 0;

    return {
      thisIncome,
      thisExpense,
      lastIncome,
      lastExpense,
      incomeDiff,
      incomeGrowth,
      expenseDiff,
      expenseGrowth,
    };
  }, [transactions, currentYear, currentMonth]);

  // Export CSV function
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Tanggal',
      'Waktu',
      'Jenis',
      'Kategori',
      'Deskripsi',
      'Nominal (Rp)',
      'Pencatat',
      'Sumber',
      'Catatan',
    ];

    const rows = reportTransactions.map((tx) => [
      `"${tx.transaction_id}"`,
      `"${tx.tanggal_transaksi}"`,
      `"${tx.waktu_pencatatan}"`,
      `"${tx.jenis_transaksi}"`,
      `"${tx.kategori}"`,
      `"${tx.deskripsi.replace(/"/g, '""')}"`,
      tx.nominal,
      `"${tx.nama_pencatat}"`,
      `"${tx.sumber_transaksi}"`,
      `"${(tx.catatan || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `selaras_finance_laporan_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan & Rekapitulasi Keuangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis arus kas harian, bulanan, dan distribusi anggaran rumah tangga
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold flex items-center shadow-xs">
            <button
              onClick={() => setReportPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                reportPeriod === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setReportPeriod('last_month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                reportPeriod === 'last_month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setReportPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                reportPeriod === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={reportTransactions.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pemasukan Periode
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(totalIncome)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {reportTransactions.filter((t) => t.jenis_transaksi === 'Pemasukan').length} pos pemasukan
          </p>
        </div>

        {/* Total Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pengeluaran Periode
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {reportTransactions.filter((t) => t.jenis_transaksi === 'Pengeluaran').length} pos belanja
          </p>
        </div>

        {/* Net Cash Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Selisih Kas Bersih
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                netBalance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-bold ${
              netBalance >= 0 ? 'text-teal-700' : 'text-rose-600'
            }`}
          >
            {formatRupiah(netBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {netBalance >= 0 ? 'Surplus terjaga' : 'Defisit anggaran'}
          </p>
        </div>

        {/* Daily Average Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Belanja Harian
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(dailyAvgExpense)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Per hari aktif transaksi</p>
        </div>
      </div>

      {/* Month-over-Month Comparison Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          Perbandingan Antarbulan (Bulan Ini vs Bulan Lalu)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Evaluasi pertumbuhan pemasukan dan pengendalian pengeluaran keluarga
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Income Comparison */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Pemasukan Bulanan</span>
              <div
                className={`flex items-center text-xs font-bold ${
                  momComparison.incomeGrowth >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {momComparison.incomeGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{Math.abs(momComparison.incomeGrowth).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {formatRupiah(momComparison.thisIncome)}
                </div>
                <span className="text-[10px] text-slate-400">Bulan Ini</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-600">
                  {formatRupiah(momComparison.lastIncome)}
                </div>
                <span className="text-[10px] text-slate-400">Bulan Lalu</span>
              </div>
            </div>
          </div>

          {/* Expense Comparison */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Pengeluaran Bulanan</span>
              <div
                className={`flex items-center text-xs font-bold ${
                  momComparison.expenseGrowth <= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {momComparison.expenseGrowth > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-amber-700" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-emerald-700" />
                )}
                <span>{Math.abs(momComparison.expenseGrowth).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {formatRupiah(momComparison.thisExpense)}
                </div>
                <span className="text-[10px] text-slate-400">Bulan Ini</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-600">
                  {formatRupiah(momComparison.lastExpense)}
                </div>
                <span className="text-[10px] text-slate-400">Bulan Lalu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Pengeluaran per Kategori & Komparasi Suami vs Istri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Rincian Pengeluaran per Kategori
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Porsi anggaran belanja pada periode terpilih
            </p>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada pos pengeluaran.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {categoryBreakdown.map((cat, idx) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {cat.name}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatRupiah(cat.amount)}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recorder Transparency: Suami vs Istri */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Transparansi Belanja Pasangan (Suami vs Istri)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi pencatatan dan pengeluaran masing-masing pasangan
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(recorderBreakdown).map(([name, data]) => {
              const expenseShare = totalExpense > 0 ? (data.expense / totalExpense) * 100 : 0;
              return (
                <div
                  key={name}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {name.toLowerCase().includes('suami')
                          ? '👨'
                          : name.toLowerCase().includes('istri')
                          ? '👩'
                          : '👥'}
                      </span>
                      <span className="font-bold text-sm text-slate-800">{name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Porsi Belanja: {expenseShare.toFixed(0)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Pemasukan Dicatat
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatRupiah(data.income)}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Pengeluaran Dicatat
                      </span>
                      <span className="font-bold text-rose-600">
                        {formatRupiah(data.expense)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Cashflow Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Rekapitulasi Harian</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Arus kas harian tersusun dari tanggal terbaru
          </p>
        </div>

        {dailyBreakdown.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">
            Tidak ada riwayat transaksi pada rentang tanggal ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-right">Pemasukan</th>
                  <th className="py-3 px-4 text-right">Pengeluaran</th>
                  <th className="py-3 px-4 text-right">Selisih Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {formatIndoDate(row.date, { withDay: true })}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500">
                      {row.count} transaksi
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      {row.income > 0 ? `+${formatRupiah(row.income)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-600">
                      {row.expense > 0 ? `-${formatRupiah(row.expense)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span
                        className={
                          row.net >= 0 ? 'text-teal-700' : 'text-rose-600'
                        }
                      >
                        {formatRupiah(row.net)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
