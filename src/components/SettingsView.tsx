import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Sparkles,
  ExternalLink,
  RefreshCw,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
} from 'lucide-react';
import { HouseholdSettings, GoogleAuthState } from '../types/finance';
import { ALL_DEFAULT_CATEGORIES } from '../data/categories';

interface SettingsViewProps {
  settings: HouseholdSettings;
  setSettings: React.Dispatch<React.SetStateAction<HouseholdSettings>>;
  googleAuth: GoogleAuthState;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onSyncGoogleSheets: () => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onSwitchMode: (mode: 'demo' | 'production') => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  googleAuth,
  onGoogleSignIn,
  onGoogleSignOut,
  onSyncGoogleSheets,
  onCreateNewSpreadsheet,
  onSwitchMode,
  onResetDemoData,
}) => {
  const [householdName, setHouseholdName] = useState(settings.nama_rumah_tangga);
  const [husbandName, setHusbandName] = useState(settings.nama_suami);
  const [wifeName, setWifeName] = useState(settings.nama_istri);
  const [activeRecorder, setActiveRecorder] = useState(settings.pencatat_aktif);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Gemini backend status
  const [geminiStatus, setGeminiStatus] = useState<{
    available: boolean;
    model: string;
    hasKey: boolean;
  } | null>(null);
  const [isCheckingGemini, setIsCheckingGemini] = useState(false);

  // Custom categories list
  const [categoriesList, setCategoriesList] = useState(ALL_DEFAULT_CATEGORIES);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'Pengeluaran' | 'Pemasukan'>('Pengeluaran');

  // Check Gemini Status
  useEffect(() => {
    checkGemini();
  }, []);

  const checkGemini = async () => {
    setIsCheckingGemini(true);
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setGeminiStatus(data);
      }
    } catch {
      setGeminiStatus({ available: false, model: 'offline', hasKey: false });
    } finally {
      setIsCheckingGemini(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings((prev) => ({
      ...prev,
      nama_rumah_tangga: householdName.trim() || 'Keluarga Harmonis',
      nama_suami: husbandName.trim() || 'Suami',
      nama_istri: wifeName.trim() || 'Istri',
      pencatat_aktif: activeRecorder,
    }));
    setSaveStatus('Pengaturan profil keluarga berhasil diperbarui!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const exists = categoriesList.some(
      (c) => c.nama_kategori.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists) return;

    setCategoriesList([
      ...categoriesList,
      {
        nama_kategori: newCatName.trim(),
        jenis_transaksi: newCatType,
        status_aktif: true,
      },
    ]);
    setNewCatName('');
  };

  const handleToggleCategory = (catName: string) => {
    setCategoriesList(
      categoriesList.map((c) =>
        c.nama_kategori === catName ? { ...c, status_aktif: !c.status_aktif } : c
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Aplikasi</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur profil rumah tangga, integrasi Google Sheets, layanan AI Gemini, dan preferensi data
        </p>
      </div>

      {saveStatus && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* 1. MODE APLIKASI (DEMO VS PRODUKSI) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mode Penyimpanan Aplikasi</h3>
              <p className="text-xs text-slate-500">
                Pilih antara mode demonstrasi pengujian atau mode produksi Google Sheets
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
              settings.app_mode === 'demo'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            {settings.app_mode === 'demo' ? 'Mode Demo' : 'Mode Produksi'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Card Mode Demo */}
          <div
            onClick={() => onSwitchMode('demo')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              settings.app_mode === 'demo'
                ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Mode Demo (Simulasi)</span>
              {settings.app_mode === 'demo' && (
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menggunakan data contoh keluarga lokal. Cocok untuk menguji AI natural language dan pemindai struk tanpa login akun Google.
            </p>
            {settings.app_mode === 'demo' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetDemoData();
                }}
                className="mt-3 text-xs text-amber-800 hover:text-amber-950 underline font-semibold"
              >
                Reset Ulang Data Demo ke Awal
              </button>
            )}
          </div>

          {/* Card Mode Produksi */}
          <div
            onClick={() => onSwitchMode('production')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              settings.app_mode === 'production'
                ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                Mode Produksi (Google Sheets)
              </span>
              {settings.app_mode === 'production' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Menyimpan seluruh transaksi keluarga langsung ke spreadsheet Google Sheets pribadi Anda secara aman dan permanen.
            </p>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE SHEETS INTEGRASI */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Integrasi Google Sheets</h3>
              <p className="text-xs text-slate-500">
                Penyimpanan spreadsheet keluarga dengan autentikasi Google Workspace resmi
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              googleAuth.isSignedIn
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {googleAuth.isSignedIn ? 'Terhubung' : 'Belum Terhubung'}
          </span>
        </div>

        {/* Status Card */}
        {googleAuth.isSignedIn ? (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">Akun Google Aktif:</p>
                <p className="text-sm font-bold text-slate-900">{googleAuth.userEmail}</p>
                {googleAuth.userName && (
                  <p className="text-xs text-slate-600">{googleAuth.userName}</p>
                )}
              </div>
              <button
                onClick={onGoogleSignOut}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar Akun Google
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-600">
                  Spreadsheet ID: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">{googleAuth.spreadsheetId || 'Otomatis dibuat'}</code>
                </p>
                {googleAuth.lastSyncTime && (
                  <p className="text-slate-400 text-[11px]">
                    Terakhir sinkron: {googleAuth.lastSyncTime}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {googleAuth.spreadsheetUrl && (
                  <a
                    href={googleAuth.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buka Google Sheets
                  </a>
                )}
                <button
                  onClick={onSyncGoogleSheets}
                  disabled={googleAuth.syncStatus === 'syncing'}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      googleAuth.syncStatus === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {googleAuth.syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Hubungkan akun Google Anda untuk mengaktifkan sinkronisasi otomatis ke Google Sheets. Spreadsheet dengan sheet <strong>TRANSAKSI</strong> dan <strong>KATEGORI</strong> akan otomatis dibuat di Google Drive Anda dengan izin pengguna.
            </p>

            {/* Official Google Sign In Button Styling */}
            <div>
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Masuk dengan Google & Hubungkan Sheets</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. STATUS LAYANAN GEMINI AI */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Layanan Google Gemini AI</h3>
              <p className="text-xs text-slate-500">
                Pencatatan bahasa alami dan pembacaan foto struk multimodal
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {geminiStatus?.available ? 'Aktif di Server' : 'Siap Digunakan'}
          </span>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-slate-800">Model: gemini-2.5-flash</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kunci API terkonfigurasi aman di lingkungan server backend (tanpa eksposur di frontend).
            </p>
          </div>
          <button
            onClick={checkGemini}
            disabled={isCheckingGemini}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700"
          >
            {isCheckingGemini ? 'Memeriksa...' : 'Cek Status'}
          </button>
        </div>
      </div>

      {/* 4. PROFIL RUMAH TANGGA & PENCATAT */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Profil Keluarga & Pasangan</h3>
            <p className="text-xs text-slate-500">
              Ubah nama rumah tangga dan identitas suami-istri untuk pencatatan
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nama Rumah Tangga
            </label>
            <input
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Contoh: Keluarga Pratama"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Suami
              </label>
              <input
                type="text"
                value={husbandName}
                onChange={(e) => setHusbandName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Suami"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Istri
              </label>
              <input
                type="text"
                value={wifeName}
                onChange={(e) => setWifeName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Istri"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pencatat Default Saat Ini
            </label>
            <select
              value={activeRecorder}
              onChange={(e) => setActiveRecorder(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white"
            >
              <option value={husbandName || 'Suami'}>👨 {husbandName || 'Suami'}</option>
              <option value={wifeName || 'Istri'}>👩 {wifeName || 'Istri'}</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Simpan Profil Keluarga
            </button>
          </div>
        </form>
      </div>

      {/* 5. MANAJEMEN KATEGORI TRANSAKSI */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Kategori Transaksi</h3>
          <p className="text-xs text-slate-500">
            Daftar kategori resmi yang digunakan untuk klasifikasi transaksi rumah tangga
          </p>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 text-xs">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Tambah nama kategori baru..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="Pengeluaran">Pengeluaran</option>
            <option value="Pemasukan">Pemasukan</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold"
          >
            Tambah
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {categoriesList.map((cat) => (
            <div
              key={cat.nama_kategori}
              onClick={() => handleToggleCategory(cat.nama_kategori)}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                cat.status_aktif
                  ? 'bg-slate-50/80 border-slate-200 text-slate-800'
                  : 'bg-slate-100/50 border-dashed border-slate-200 text-slate-400 line-through'
              }`}
            >
              <span className="truncate">{cat.nama_kategori}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  cat.jenis_transaksi === 'Pemasukan'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {cat.jenis_transaksi === 'Pemasukan' ? 'In' : 'Out'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
