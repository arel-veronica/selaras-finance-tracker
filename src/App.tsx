/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { AddTransactionView } from './components/AddTransactionView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ConfirmationModal } from './components/ConfirmationModal';

import { Transaction, HouseholdSettings, GoogleAuthState } from './types/finance';
import { INITIAL_DEMO_TRANSACTIONS } from './data/demoData';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from './lib/firebaseAuth';
import {
  findOrCreateHouseholdSpreadsheet,
  fetchTransactionsFromSheet,
  appendTransactionToSheet,
  updateTransactionInSheet,
  deleteTransactionFromSheet,
  getSpreadsheetMetadata,
} from './lib/sheetsService';

const DEMO_STORAGE_KEY = 'selaras_demo_transactions_v1';
const SETTINGS_STORAGE_KEY = 'selaras_settings_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Household settings
  const [settings, setSettings] = useState<HouseholdSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to read settings from storage', e);
    }
    return {
      nama_rumah_tangga: 'Keluarga Pratama',
      nama_suami: 'Suami',
      nama_istri: 'Istri',
      pencatat_aktif: 'Suami',
      mata_uang: 'IDR',
      app_mode: 'demo',
    };
  });

  // Save settings changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }, [settings]);

  // Demo transactions (isolated from production)
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to read demo data from storage', e);
    }
    return INITIAL_DEMO_TRANSACTIONS;
  });

  // Save demo transactions to storage
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoTransactions));
    } catch (e) {
      console.warn('Failed to persist demo data', e);
    }
  }, [demoTransactions]);

  // Production transactions (loaded from Google Sheets)
  const [productionTransactions, setProductionTransactions] = useState<Transaction[]>([]);

  // Google Auth State
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthState>({
    isSignedIn: false,
    userEmail: null,
    userName: null,
    userPhoto: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    syncStatus: 'idle',
    lastSyncTime: null,
    errorMessage: null,
  });

  // Sheet ID metadata for batchUpdate delete
  const [transaksiSheetNumericId, setTransaksiSheetNumericId] = useState<number>(0);

  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Delete Confirmation State
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active transaction list depending on current mode
  const currentTransactions = useMemo(() => {
    return settings.app_mode === 'demo' ? demoTransactions : productionTransactions;
  }, [settings.app_mode, demoTransactions, productionTransactions]);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        if (token) {
          setGoogleAuth((prev) => ({
            ...prev,
            isSignedIn: true,
            userEmail: user.email,
            userName: user.displayName,
            userPhoto: user.photoURL,
          }));
        } else {
          setGoogleAuth((prev) => ({
            ...prev,
            isSignedIn: false,
            userEmail: null,
            userName: null,
            userPhoto: null,
          }));
        }
      },
      () => {
        setGoogleAuth((prev) => ({
          ...prev,
          isSignedIn: false,
          userEmail: null,
          userName: null,
          userPhoto: null,
        }));
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync Google Sheets handler
  const syncGoogleSheets = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setGoogleAuth((prev) => ({
        ...prev,
        syncStatus: 'error',
        errorMessage: 'Belum masuk ke akun Google. Silakan klik Masuk dengan Google.',
      }));
      return;
    }

    setGoogleAuth((prev) => ({ ...prev, syncStatus: 'syncing', errorMessage: null }));

    try {
      // Find or create spreadsheet in user's Drive
      const sheetInfo = await findOrCreateHouseholdSpreadsheet(
        token,
        `Selaras Finance - Catatan Keuangan ${settings.nama_rumah_tangga || 'Keluarga'}`
      );

      // Fetch metadata to obtain internal sheet ID for batchUpdate delete operations
      const meta = await getSpreadsheetMetadata(token, sheetInfo.id);
      setTransaksiSheetNumericId(meta.transaksiSheetId);

      // Read rows
      const txs = await fetchTransactionsFromSheet(token, sheetInfo.id);
      setProductionTransactions(txs);

      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setGoogleAuth((prev) => ({
        ...prev,
        isSignedIn: true,
        spreadsheetId: sheetInfo.id,
        spreadsheetUrl: sheetInfo.url,
        syncStatus: 'synced',
        lastSyncTime: nowStr,
        errorMessage: null,
      }));
    } catch (err: any) {
      console.error('Sync Google Sheets error:', err);
      setGoogleAuth((prev) => ({
        ...prev,
        syncStatus: 'error',
        errorMessage: err.message || 'Gagal menyinkronkan dengan Google Sheets',
      }));
    }
  }, [settings.nama_rumah_tangga]);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setGoogleAuth((prev) => ({ ...prev, syncStatus: 'syncing', errorMessage: null }));
      const result = await googleSignIn();
      if (result) {
        setGoogleAuth((prev) => ({
          ...prev,
          isSignedIn: true,
          userEmail: result.user.email,
          userName: result.user.displayName,
          userPhoto: result.user.photoURL,
        }));

        // Switch to production mode if user signs in
        setSettings((prev) => ({ ...prev, app_mode: 'production' }));

        // Immediately sync spreadsheet
        await syncGoogleSheets();
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setGoogleAuth((prev) => ({
        ...prev,
        syncStatus: 'error',
        errorMessage: err.message || 'Gagal login dengan akun Google',
      }));
    }
  };

  // Handle Google Sign Out
  const handleGoogleSignOut = async () => {
    await logout();
    setGoogleAuth({
      isSignedIn: false,
      userEmail: null,
      userName: null,
      userPhoto: null,
      spreadsheetId: null,
      spreadsheetUrl: null,
      syncStatus: 'idle',
      lastSyncTime: null,
      errorMessage: null,
    });
    // Switch to demo mode when signed out
    setSettings((prev) => ({ ...prev, app_mode: 'demo' }));
  };

  // Switch between Demo and Production
  const handleSwitchMode = (mode: 'demo' | 'production') => {
    if (mode === 'production' && !googleAuth.isSignedIn) {
      setActiveTab('settings');
      alert('Untuk menggunakan Mode Produksi, silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }
    setSettings((prev) => ({ ...prev, app_mode: mode }));
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    if (window.confirm('Reset data contoh ke kondisi awal?')) {
      setDemoTransactions(INITIAL_DEMO_TRANSACTIONS);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
    }
  };

  // ==========================================
  // TRANSACTION CRUD OPERATIONS
  // ==========================================

  // Save new transactions (from text AI, receipt OCR, or manual form)
  const handleSaveTransactions = async (newItems: Transaction[]) => {
    if (settings.app_mode === 'demo') {
      // In Demo mode: save to local demo array
      setDemoTransactions((prev) => [...newItems, ...prev]);
      return;
    }

    // In Production mode: append to Google Sheets
    const token = await getAccessToken();
    if (!token || !googleAuth.spreadsheetId) {
      throw new Error(
        'Belum tersambung ke Google Sheets. Pastikan Anda sudah login ke akun Google di Pengaturan.'
      );
    }

    // Append each item
    for (const item of newItems) {
      await appendTransactionToSheet(token, googleAuth.spreadsheetId, item);
    }

    // Refresh transactions from sheet
    await syncGoogleSheets();
  };

  // Update existing transaction
  const handleUpdateTransaction = async (updated: Transaction) => {
    if (settings.app_mode === 'demo') {
      setDemoTransactions((prev) =>
        prev.map((t) => (t.transaction_id === updated.transaction_id ? updated : t))
      );
      setEditingTransaction(null);
      return;
    }

    // In Production mode
    const token = await getAccessToken();
    if (!token || !googleAuth.spreadsheetId) {
      alert('Google Sheets belum terhubung.');
      return;
    }

    if (updated.sheetRowIndex) {
      await updateTransactionInSheet(
        token,
        googleAuth.spreadsheetId,
        updated.sheetRowIndex,
        updated
      );
      await syncGoogleSheets();
    } else {
      // If row index is missing, re-fetch and update
      await syncGoogleSheets();
    }
    setEditingTransaction(null);
  };

  // Delete transaction with user confirmation (destructive operation requirement)
  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    setIsDeleting(true);
    try {
      if (settings.app_mode === 'demo') {
        setDemoTransactions((prev) =>
          prev.filter((t) => t.transaction_id !== deletingTransaction.transaction_id)
        );
      } else {
        // Production mode
        const token = await getAccessToken();
        if (!token || !googleAuth.spreadsheetId) {
          throw new Error('Google Sheets belum terhubung');
        }

        if (deletingTransaction.sheetRowIndex) {
          await deleteTransactionFromSheet(
            token,
            googleAuth.spreadsheetId,
            transaksiSheetNumericId,
            deletingTransaction.sheetRowIndex
          );
        }
        await syncGoogleSheets();
      }
      setDeletingTransaction(null);
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + (err.message || 'unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        setSettings={setSettings}
        googleAuth={googleAuth}
        onSyncGoogleSheets={syncGoogleSheets}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settings={settings}
          setSettings={setSettings}
          googleAuth={googleAuth}
          onSyncGoogleSheets={syncGoogleSheets}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={currentTransactions}
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenEditModal={(tx) => setEditingTransaction(tx)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={currentTransactions}
              settings={settings}
              onEdit={(tx) => setEditingTransaction(tx)}
              onDeleteRequest={(tx) => setDeletingTransaction(tx)}
              onAddNew={() => setActiveTab('add-transaction')}
            />
          )}

          {activeTab === 'add-transaction' && (
            <AddTransactionView
              settings={settings}
              onSaveTransactions={handleSaveTransactions}
              onNavigateToTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView transactions={currentTransactions} settings={settings} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              googleAuth={googleAuth}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              onSyncGoogleSheets={syncGoogleSheets}
              onCreateNewSpreadsheet={syncGoogleSheets}
              onSwitchMode={handleSwitchMode}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>

        {/* Ergonomic Mobile Bottom Navigation */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleUpdateTransaction}
      />

      {/* Destructive Action Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!deletingTransaction}
        title="Hapus Catatan Transaksi?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${deletingTransaction?.deskripsi}" sebesar Rp ${deletingTransaction?.nominal.toLocaleString('id-ID')}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Transaksi"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setDeletingTransaction(null)}
      />
    </div>
  );
}
