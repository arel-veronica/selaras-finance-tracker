import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  FileBarChart2,
  Settings,
  Sparkles,
  CloudCheck,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { HouseholdSettings, GoogleAuthState } from '../types/finance';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: HouseholdSettings;
  setSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  googleAuth: GoogleAuthState;
  onSyncGoogleSheets: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  setSettings,
  googleAuth,
  onSyncGoogleSheets,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'add-transaction', label: 'Tambah Transaksi', icon: PlusCircle, highlight: true },
    { id: 'reports', label: 'Laporan Keuangan', icon: FileBarChart2 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <span className="font-extrabold text-lg tracking-wider">SF</span>
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
              SELARAS FINANCE
            </h1>
            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
              {settings.nama_rumah_tangga || 'Keuangan Rumah Tangga'}
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-3 text-[11px] text-slate-500 italic bg-emerald-50/60 text-emerald-800/90 px-2.5 py-1.5 rounded-lg border border-emerald-100/60 leading-tight">
          "Keuangan tertata, rumah tangga lebih tenang."
        </p>
      </div>

      {/* Active Recorder Switcher */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            Pencatat Aktif
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">Bisa ganti kapan saja</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, pencatat_aktif: prev.nama_suami || 'Suami' }))}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              settings.pencatat_aktif === (settings.nama_suami || 'Suami')
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👨</span>
            <span className="truncate">{settings.nama_suami || 'Suami'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, pencatat_aktif: prev.nama_istri || 'Istri' }))}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              settings.pencatat_aktif === (settings.nama_istri || 'Istri')
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👩</span>
            <span className="truncate">{settings.nama_istri || 'Istri'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold'
                  : item.highlight
                  ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/60 border border-emerald-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.highlight && !isActive && (
                <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-200/70 text-emerald-800 px-1.5 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Google Sheets / Storage Status Card */}
      <div className="p-3 m-3 bg-slate-50 border border-slate-200/70 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Penyimpanan
          </span>
          {settings.app_mode === 'demo' ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              MODE DEMO
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              SHEETS AKTIF
            </span>
          )}
        </div>

        {settings.app_mode === 'demo' ? (
          <div className="text-xs text-slate-600 space-y-1.5">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Data tersimpan sementara di memori browser. Belum tersambung permanen ke Google Sheets.
            </p>
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full text-center text-xs font-medium text-emerald-700 hover:text-emerald-800 py-1 hover:underline"
            >
              Hubungkan Google Sheets →
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">{googleAuth.userEmail || 'Akun Google Terhubung'}</span>
            </div>
            {googleAuth.spreadsheetUrl && (
              <a
                href={googleAuth.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Buka Spreadsheet
              </a>
            )}
            <button
              onClick={onSyncGoogleSheets}
              disabled={googleAuth.syncStatus === 'syncing'}
              className="w-full py-1.5 px-2 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {googleAuth.syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
