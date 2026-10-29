import React, { useState } from 'react';
import { StoreSettings, TextScale } from '../types';
import {
  Store,
  Moon,
  Sun,
  Type,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
}) => {
  // Store info state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Reset confirmation modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      storeName: storeName.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleToggleTheme = () => {
    onSaveSettings({
      ...settings,
      isDarkMode: !settings.isDarkMode,
    });
  };

  const handleSetTextScale = (scale: TextScale) => {
    onSaveSettings({
      ...settings,
      textScale: scale,
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Toast Notifikasi Berhasil Simpan */}
      {showSavedToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl font-bold text-xs animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          Pengaturan berhasil disimpan!
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
          Pengaturan Warung & Aplikasi
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Ubah informasi toko, preferensi mode gelap, dan ukuran teks.
        </p>
      </div>

      {/* 1. Tampilan & Kenyamanan (Tema & Ukuran Teks untuk Segala Usia) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <Type className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            Tampilan & Kenyamanan Baca (Mudah Dibaca Segala Usia)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mode Terang / Gelap */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              Pilihan Mode Tampilan:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => settings.isDarkMode && handleToggleTheme()}
                className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                  !settings.isDarkMode
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Sun className="w-4 h-4" />
                Mode Terang
              </button>
              <button
                type="button"
                onClick={() => !settings.isDarkMode && handleToggleTheme()}
                className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                  settings.isDarkMode
                    ? 'bg-stone-800 text-white border-stone-700 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Moon className="w-4 h-4" />
                Mode Gelap
              </button>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
              Gunakan mode gelap saat malam hari agar tidak silau di mata kasir.
            </p>
          </div>

          {/* Ukuran Teks */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              Ukuran Teks Antarmuka:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Normal (15px)' },
                { id: 'large', label: 'Besar (17px)' },
                { id: 'xlarge', label: 'Sangat Besar' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSetTextScale(s.id as TextScale)}
                  className={`py-3 px-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                    settings.textScale === s.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
              Pilih &ldquo;Besar&rdquo; atau &ldquo;Sangat Besar&rdquo; jika ingin tulisan lebih jelas tanpa kacamata.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Informasi Warung */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <Store className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            Profil & Header Nota Warung
          </h3>
        </div>

        <form onSubmit={handleSaveStoreProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Nama Warung:
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Slogan / Deskripsi:
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Alamat Warung:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Nomor Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Profil Warung
          </button>
        </form>
      </div>

      {/* 3. Segarkan Data & Sinkronisasi Ulang */}
      <div className="bg-stone-100 dark:bg-stone-900/40 rounded-2xl p-5 border border-dashed border-stone-300 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-stone-500" />
            Segarkan Katalog &amp; Sinkronisasi Data
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Muat ulang data katalog bahan dan pengaturan sistem warung dari database.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="py-2 px-4 rounded-xl border border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs font-bold transition cursor-pointer"
        >
          Sinkronkan Ulang Data
        </button>
      </div>

      {/* MODAL: Konfirmasi Reset Data */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Sinkronkan Ulang Data Master?
              </h4>
              <p className="text-xs text-stone-500">
                Katalog lokal akan disegarkan kembali sesuai data master dari sistem Waroeng Seblak 48.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onResetAllData();
                  setIsResetConfirmOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ya, Sinkronkan
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
