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
  Trash2,
} from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
  onResetAllData: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
  onClearAllData,
}) => {
  // Store info state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Reset confirmation modals
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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

      {/* 3. Pengelolaan Data: Kosongkan Data vs Muat Data Contoh */}
      <div className="space-y-3">
        {/* Opsi 1: Kosongkan Semua Data Dummy (Mulai dari Nol) */}
        <div className="bg-red-50/70 dark:bg-red-950/25 rounded-2xl p-5 border border-dashed border-red-300 dark:border-red-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-red-900 dark:text-red-200 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-600" />
              Kosongkan Semua Data Dummy (Mulai dari Nol)
            </h4>
            <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-0.5">
              Hapus seluruh daftar barang contoh, menu, dan riwayat transaksi sehingga Anda dapat mulai menginput data asli toko.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Data</span>
          </button>
        </div>

        {/* Opsi 2: Muat Ulang Data Contoh */}
        <div className="bg-stone-100 dark:bg-stone-900/40 rounded-2xl p-5 border border-dashed border-stone-300 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-stone-500" />
              Muat Ulang Data Contoh (Dummy Demo)
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Muat ulang kembali paket bahan seblak contoh dan transaksi demo jika Anda ingin melakukan uji coba tampilan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold transition cursor-pointer shrink-0"
          >
            Muat Data Contoh
          </button>
        </div>
      </div>

      {/* MODAL: Konfirmasi Kosongkan Semua Data */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Kosongkan Seluruh Data?
              </h4>
              <p className="text-xs text-stone-500">
                Semua daftar bahan baku, menu, dan riwayat transaksi dummy akan direset menjadi <strong>0 (kosong)</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClearAllData();
                  setIsClearConfirmOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ya, Kosongkan
              </button>
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Reset Data Contoh */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Muat Ulang Data Contoh?
              </h4>
              <p className="text-xs text-stone-500">
                Katalog lokal akan diisi kembali dengan paket 48 bahan baku dan transaksi demo.
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
                Ya, Muat Ulang
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
