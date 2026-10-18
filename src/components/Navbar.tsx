import React, { useState } from 'react';
import {
  Menu,
  X,
  Plus,
  Sparkles,
  LayoutDashboard,
  ArrowLeftRight,
  FileBarChart2,
  Settings,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { HouseholdSettings, GoogleAuthState } from '../types/finance';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: HouseholdSettings;
  setSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  googleAuth: GoogleAuthState;
  onSyncGoogleSheets: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  setSettings,
  googleAuth,
  onSyncGoogleSheets,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'add-transaction', label: 'Tambah Transaksi', icon: Plus, highlight: true },
    { id: 'reports', label: 'Laporan', icon: FileBarChart2 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Brand & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5 md:hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                SF
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                SELARAS FINANCE
              </span>
            </div>

            {/* Desktop Page Title */}
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-slate-900 capitalize">
                {activeTab === 'dashboard' && 'Dashboard Keuangan'}
                {activeTab === 'transactions' && 'Daftar Transaksi'}
                {activeTab === 'add-transaction' && 'Pencatatan Transaksi Baru'}
                {activeTab === 'reports' && 'Laporan & Rekap Keuangan'}
                {activeTab === 'settings' && 'Pengaturan Aplikasi'}
              </h2>
            </div>
          </div>

          {/* Right: Mode Badge & Quick Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mode Indicator Badge */}
            {settings.app_mode === 'demo' ? (
              <div
                onClick={() => setActiveTab('settings')}
                role="button"
                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-semibold hover:bg-amber-100 transition-colors"
                title="Klik untuk beralih atau menghubungkan Google Sheets"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline">MODE DEMO</span>
                <span className="sm:hidden">DEMO</span>
              </div>
            ) : (
              <div
                onClick={() => setActiveTab('settings')}
                role="button"
                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">GOOGLE SHEETS</span>
                <span className="sm:hidden">SHEETS</span>
                {googleAuth.syncStatus === 'syncing' && (
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                )}
              </div>
            )}

            {/* Active Recorder Badge / Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    pencatat_aktif: prev.nama_suami || 'Suami',
                  }))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  settings.pencatat_aktif === (settings.nama_suami || 'Suami')
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Aktif: ${settings.nama_suami || 'Suami'}`}
              >
                👨 <span className="hidden sm:inline">{settings.nama_suami || 'Suami'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    pencatat_aktif: prev.nama_istri || 'Istri',
                  }))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  settings.pencatat_aktif === (settings.nama_istri || 'Istri')
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Aktif: ${settings.nama_istri || 'Istri'}`}
              >
                👩 <span className="hidden sm:inline">{settings.nama_istri || 'Istri'}</span>
              </button>
            </div>

            {/* Quick Add Button */}
            {activeTab !== 'add-transaction' && (
              <button
                onClick={() => setActiveTab('add-transaction')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Catat Transaksi</span>
                <span className="sm:hidden">Catat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <p className="text-xs text-slate-400 font-semibold px-2 uppercase tracking-wider">
            Menu Selaras Finance
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-2 text-xs text-slate-500">
            <span>Rumah Tangga: {settings.nama_rumah_tangga}</span>
            <span>{settings.app_mode === 'demo' ? 'Mode Demo' : 'Google Sheets'}</span>
          </div>
        </div>
      )}
    </header>
  );
};
