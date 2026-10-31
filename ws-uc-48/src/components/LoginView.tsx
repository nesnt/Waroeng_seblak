import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Lock,
  Mail,
  ArrowLeft,
  Sun,
  Moon,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  Loader2,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { getRateLimitStatus, recordFailedAttempt, resetRateLimit } from '../utils/authRateLimit';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginViewProps {
  settings: StoreSettings;
  onToggleTheme: () => void;
  onBackToCustomerOrder: () => void;
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  onToggleTheme,
  onBackToCustomerOrder,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimit, setRateLimit] = useState(() => getRateLimitStatus('seblak48_kasir'));

  // Timer cooldown lockout rate limit (1 menit setelah 3x gagal)
  useEffect(() => {
    if (!rateLimit.isLocked) return;
    const interval = setInterval(() => {
      const status = getRateLimitStatus('seblak48_kasir');
      setRateLimit(status);
      if (!status.isLocked) {
        setLoginError('');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimit.isLocked]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const current = getRateLimitStatus('seblak48_kasir');
    if (current.isLocked) {
      setLoginError(`Akses terkunci sementara. Silakan tunggu ${current.remainingSeconds} detik sebelum mencoba lagi.`);
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    const passTrim = password.trim();

    setIsSubmitting(true);
    setLoginError('');

    try {
      // 1. Jika Supabase aktif, verifikasi ke Supabase Auth
      if (isSupabaseConfigured()) {
        const normalized = emailTrim.includes('@') ? emailTrim : `${emailTrim}@seblak48.id`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: passTrim,
        });

        if (data?.user) {
          resetRateLimit('seblak48_kasir');
          setLoginError('');
          onLoginSuccess();
          return;
        }
      }

      // 2. Cek akun kasir / admin dari penyimpanan akun pengguna lokal (seblak48_users)
      let isMatchedUser = false;
      try {
        const rawUsers = localStorage.getItem('seblak48_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (Array.isArray(users)) {
            const matched = users.find(
              (u: any) =>
                u.username.toLowerCase() === emailTrim &&
                u.password === passTrim &&
                (u.role === 'KASIR' || u.role === 'ADMIN')
            );
            if (matched) isMatchedUser = true;
          }
        }
      } catch (e) {}

      // 3. Kredensial Kasir fallback offline
      const isDefaultNabil =
        (emailTrim === 'nabil@gmail.com' || emailTrim === 'nabil') &&
        passTrim === 'I2345678*';

      const isValidKasir =
        isMatchedUser ||
        isDefaultNabil ||
        ((emailTrim === 'kasir@seblak48.id' ||
          emailTrim === 'kasir' ||
          emailTrim === 'kasir1' ||
          emailTrim === 'admin@seblak48.id') &&
          (passTrim === 'kasir48' || passTrim === 'seblak48' || passTrim === 'kasir123'));

      if (isValidKasir) {
        resetRateLimit('seblak48_kasir');
        setLoginError('');
        onLoginSuccess();
      } else {
        const res = recordFailedAttempt('seblak48_kasir');
        setRateLimit(res);
        if (res.isLocked) {
          setLoginError('Terlalu banyak percobaan gagal (3x). Akses kasir di perangkat ini dibatasi selama 1 menit.');
        } else {
          const sisa = res.maxAttempts - res.attempts;
          setLoginError(`Email atau kata sandi kasir salah! Sisa percobaan sebelum terkunci: ${sisa}x.`);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Bar */}
      <header className="w-full px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToCustomerOrder}
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-bold text-xs transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" />
            <span>Kembali ke Layanan Pelanggan</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer shadow-xs"
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
          className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden"
        >
          {/* Header Banner Login */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-6 text-white text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mx-auto shadow-md border border-white/25">
              <Flame className="w-8 h-8 fill-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Portal Khusus Petugas Kasir
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                {settings.storeName}
              </h1>
              <p className="text-xs text-orange-100">
                Pencatatan Mangkuk, Hitung Topping &amp; Pembayaran (/kasir)
              </p>
            </div>
          </div>

          {/* Form Login Kasir */}
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {/* Alert Cooldown / Rate Limit Lockout */}
            {rateLimit.isLocked && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 animate-pulse">
                <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Akses Terkunci Sementara (Cooldown)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Perangkat telah gagal melakukan login 3 kali. Mohon tunggu{' '}
                  <strong className="text-amber-700 dark:text-amber-300 font-black text-sm">
                    {rateLimit.remainingSeconds} detik
                  </strong>{' '}
                  sebelum mencoba lagi.
                </p>
              </div>
            )}

            {/* Error Message Biasa */}
            {loginError && !rateLimit.isLocked && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                Email / ID Kasir
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kasir@seblak48.id"
                  disabled={rateLimit.isLocked}
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                Kata Sandi Kasir
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  disabled={rateLimit.isLocked}
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={rateLimit.isLocked}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer disabled:opacity-50"
                  title={showPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={rateLimit.isLocked || isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-99 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    {rateLimit.isLocked
                      ? `Terkunci (${rateLimit.remainingSeconds}s)`
                      : 'Masuk ke Kasir'}
                  </span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-stone-400 dark:text-stone-600">
        {settings.storeName} · Portal Operasional Kasir
      </footer>
    </div>
  );
};
