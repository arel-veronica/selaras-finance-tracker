import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { Transaction } from '../types/finance';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../data/categories';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
      setError(null);
    }
  }, [transaction]);

  if (!isOpen || !formData) return null;

  const categories =
    formData.jenis_transaksi === 'Pengeluaran'
      ? DEFAULT_EXPENSE_CATEGORIES
      : DEFAULT_INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deskripsi.trim()) {
      setError('Deskripsi transaksi wajib diisi');
      return;
    }
    if (formData.nominal <= 0) {
      setError('Nominal harus lebih besar dari Rp 0');
      return;
    }
    if (!formData.tanggal_transaksi) {
      setError('Tanggal transaksi wajib diisi');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit Transaksi</h3>
            <p className="text-xs text-slate-500">ID: {formData.transaction_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Jenis Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    jenis_transaksi: 'Pengeluaran',
                    kategori: DEFAULT_EXPENSE_CATEGORIES[0].nama_kategori,
                  });
                }}
                className={`py-2 px-3 text-sm font-medium rounded-xl border text-center transition-all ${
                  formData.jenis_transaksi === 'Pengeluaran'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    jenis_transaksi: 'Pemasukan',
                    kategori: DEFAULT_INCOME_CATEGORIES[0].nama_kategori,
                  });
                }}
                className={`py-2 px-3 text-sm font-medium rounded-xl border text-center transition-all ${
                  formData.jenis_transaksi === 'Pemasukan'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.nominal || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nominal: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Deskripsi Transaksi
            </label>
            <input
              type="text"
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="Contoh: Beli sayur dan buah di pasar"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori
              </label>
              <select
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                {categories.map((c) => (
                  <option key={c.nama_kategori} value={c.nama_kategori}>
                    {c.nama_kategori}
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={formData.tanggal_transaksi}
                onChange={(e) => setFormData({ ...formData, tanggal_transaksi: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Pencatat */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Dicatat Oleh
              </label>
              <select
                value={formData.nama_pencatat}
                onChange={(e) => setFormData({ ...formData, nama_pencatat: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="Suami">👨 Suami</option>
                <option value="Istri">👩 Istri</option>
                <option value="Bersama">👥 Bersama</option>
              </select>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                value={formData.catatan || ''}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Tempat, metode bayar, dll"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
