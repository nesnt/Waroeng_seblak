import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Lock,
  Mail,
  ArrowRight,
  Soup,
  ClipboardCheck,
  Sun,
  Moon,
  Store,
} from 'lucide-react';
import { StoreSettings } from '../types';

interface LoginViewProps {
  settings: StoreSettings;
  onToggleTheme: () => void;
  onOpenCustomerOrder: () => void;
  onOpenCashierRecord: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  onToggleTheme,
  onOpenCustomerOrder,
  onOpenCashierRecord,
}) => {
  const [email, setEmail] = useState(settings.userEmail || 'kasir@seblak48.id');
  const [password, setPassword] = useState('seblak48');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenCashierRecord();
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Bar */}
      <header className="w-full px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                {settings.storeName}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {settings.address}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Ganti Mode Tampilan"
          >
            {settings.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6"
        >
          {/* Brand Header */}
          <div className="text-center space-y-2 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-600/20">
              <Flame className="w-8 h-8 fill-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 pt-1">
              Portal {settings.storeName}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Masuk ke sistem kasir atau pilih layanan pemesanan di bawah ini.
            </p>
          </div>

          {/* Tombol Fitur Utama: Catat Kasir & Pesan Seblak Pembeli */}
          <div className="space-y-3">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Pilih Mode Layanan Cepat
            </span>

            {/* Tombol Baru: Catat Kasir */}
            <button
              type="button"
              onClick={onOpenCashierRecord}
              className="w-full p-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white shadow-lg shadow-orange-600/20 flex items-center justify-between gap-3 transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-black block">
                    Catat Kasir (Hitung Topping)
                  </span>
                  <span className="text-xs text-orange-100 block truncate">
                    Pencatatan Manual &amp; Otomatis Berdasarkan No. Mangkuk
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Tombol Pesan Seblak (Pembeli) */}
            <button
              type="button"
              onClick={onOpenCustomerOrder}
              className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 flex items-center justify-between gap-3 transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Soup className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-black block">
                    Pesan Seblak (Layar Pembeli)
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
                    Input Nomor Mangkuk, Nama, Racikan Kuah &amp; Minuman
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-stone-400 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Form Login Akun Kasir */}
          <form
            onSubmit={handleLoginSubmit}
            className="pt-5 border-t border-stone-100 dark:border-stone-800 space-y-4"
          >
            <span className="block text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Login Akun Kasir / Admin
            </span>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Email Kasir
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold py-3 pl-10 pr-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Kata Sandi / PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold py-3 pl-10 pr-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Masuk ke Catat Kasir</span>
            </button>
          </form>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-stone-400 dark:text-stone-600">
        {settings.storeName} · Sistem Prasmanan &amp; Kasir Terpadu
      </footer>
    </div>
  );
};
