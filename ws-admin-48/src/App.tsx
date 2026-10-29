/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Ingredient,
  MenuItem,
  Transaction,
  StoreSettings,
} from './types';
import {
  getIngredients,
  saveIngredient,
  deleteIngredient,
  adjustStock,
  getMenuItems,
  saveMenuItem,
  deleteMenuItem,
  getTransactions,
  getSettings,
  saveSettings,
  resetToDefaultData,
  fetchIngredientsFromSupabase,
  fetchMenuItemsFromSupabase,
  fetchTransactionsFromSupabase,
  fetchSettingsFromSupabase,
  subscribeToIngredients,
  subscribeToTransactions,
} from './services/storage';
import { DesktopSidebar, MobileNavigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import { SalesReportView } from './components/SalesReportView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { verifyAdminLogin } from './services/accountService';
import { Flame, Lock, Mail, LogIn, Eye, EyeOff, ShieldCheck, Sun, Moon, AlertCircle, Clock } from 'lucide-react';
import { getRateLimitStatus, recordFailedAttempt, resetRateLimit } from './utils/authRateLimit';

export default function App() {
  // Application Data States
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => getIngredients());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions());
  const [settings, setSettings] = useState<StoreSettings>(() => getSettings());

  // UI Navigation & Auth State dengan Rate Limiting Cooldown
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('seblak48_admin_session') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [rateLimit, setRateLimit] = useState(() => getRateLimitStatus('seblak48_admin'));
  const [activeTab, setActiveTab] = useState<string>('beranda');
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [targetQuickRestockId, setTargetQuickRestockId] = useState<string | null>(null);

  // Easter Egg: Buka Modal Manajemen Akun dengan klik logo di kiri atas 5x
  const [secretClickCount, setSecretClickCount] = useState<number>(0);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);

  const handleSecretIconClick = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastClickTimeRef.current <= 3000) {
      newCount = secretClickCount + 1;
    }
    lastClickTimeRef.current = now;

    if (newCount >= 5) {
      setIsAccountModalOpen(true);
      setSecretClickCount(0);
    } else {
      setSecretClickCount(newCount);
    }
  };

  // Timer cooldown lockout rate limit
  useEffect(() => {
    if (!rateLimit.isLocked) return;
    const interval = setInterval(() => {
      const status = getRateLimitStatus('seblak48_admin');
      setRateLimit(status);
      if (!status.isLocked) {
        setLoginError('');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimit.isLocked]);

  // Ambil data live dari Supabase & pasang subscription WebSockets realtime saat aplikasi dibuka
  useEffect(() => {
    fetchIngredientsFromSupabase().then(setIngredients);
    fetchMenuItemsFromSupabase().then(setMenuItems);
    fetchTransactionsFromSupabase().then(setTransactions);
    fetchSettingsFromSupabase().then(setSettings);

    const unsubIng = subscribeToIngredients(setIngredients);
    const unsubTx = subscribeToTransactions(setTransactions);

    return () => {
      unsubIng();
      unsubTx();
    };
  }, []);

  // Sync settings with DOM (Dark Mode and Text Scale)
  useEffect(() => {
    // 1. Dark Mode
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Text Scaling for Senior / Non-technical Owners
    document.body.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
    document.body.classList.add(`text-scale-${settings.textScale}`);
  }, [settings.isDarkMode, settings.textScale]);

  // Refresh all state from local storage / data layer
  const refreshData = useCallback(() => {
    setIngredients(getIngredients());
    setMenuItems(getMenuItems());
    setTransactions(getTransactions());
    setSettings(getSettings());
    fetchIngredientsFromSupabase().then(setIngredients);
    fetchTransactionsFromSupabase().then(setTransactions);
  }, []);

  // Quick Restock shortcut from Dashboard
  const handleQuickRestockFromDashboard = (ing: Ingredient) => {
    setTargetQuickRestockId(ing.id);
    setActiveTab('stok');
  };

  // Adjust stock handler
  const handleAdjustStock = (
    id: string,
    amount: number,
    type: 'masuk' | 'keluar',
    note: string
  ) => {
    adjustStock(id, amount, type, note);
    refreshData();
  };

  // Save ingredient handler
  const handleSaveIngredient = (ing: Ingredient) => {
    saveIngredient(ing);
    refreshData();
  };

  // Delete ingredient handler
  const handleDeleteIngredient = (id: string) => {
    deleteIngredient(id);
    refreshData();
  };

  // Save menu item handler
  const handleSaveMenuItem = (menu: MenuItem) => {
    saveMenuItem(menu);
    refreshData();
  };

  // Delete menu item handler
  const handleDeleteMenuItem = (id: string) => {
    deleteMenuItem(id);
    refreshData();
  };

  // Save settings handler
  const handleSaveSettings = (newSettings: StoreSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Toggle theme helper
  const handleToggleTheme = () => {
    const updated = {
      ...settings,
      isDarkMode: !settings.isDarkMode,
    };
    handleSaveSettings(updated);
  };

  // Reset to default dummy demo
  const handleResetAllData = () => {
    resetToDefaultData();
    refreshData();
  };

  const lowStockCount = useMemo(() => {
    return ingredients.filter((i) => i.currentStock <= i.minStock).length;
  }, [ingredients]);

  const handleLogout = () => {
    sessionStorage.removeItem('seblak48_admin_session');
    setIsLoggedIn(false);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = getRateLimitStatus('seblak48_admin');
    if (current.isLocked) {
      setLoginError(`Akses terkunci sementara. Silakan tunggu ${current.remainingSeconds} detik sebelum mencoba lagi.`);
      return;
    }

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    // Verifikasi kredensial akun Pengelola / Admin via accountService
    const authRes = verifyAdminLogin(emailTrim, passTrim);

    if (authRes.success && authRes.user) {
      resetRateLimit('seblak48_admin');
      setLoginError('');
      sessionStorage.setItem('seblak48_admin_session', 'true');
      handleSaveSettings({
        ...settings,
        userName: authRes.user.fullName,
        userRole: 'Administrator',
        userEmail: authRes.user.username,
      });
      setIsLoggedIn(true);
    } else {
      const res = recordFailedAttempt('seblak48_admin');
      setRateLimit(res);
      if (res.isLocked) {
        setLoginError(`Terlalu banyak percobaan gagal (3x). Akses perangkat ini dibatasi selama 1 menit.`);
      } else {
        const sisa = res.maxAttempts - res.attempts;
        setLoginError(authRes.error || `Email atau kata sandi pengelola salah! Sisa percobaan sebelum terkunci: ${sisa}x.`);
      }
    }
  };

  // HALAMAN LOGIN ADMIN (Dilindungi Rate Limit 3x Gagal & Cooldown 1 Menit)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 relative transition-colors duration-200">
        {/* Tombol Rahasia Icon Kiri Atas (Klik 5x untuk Kelola Akun) */}
        <button
          type="button"
          onClick={handleSecretIconClick}
          className="fixed top-4 left-4 p-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 shadow-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-2 group select-none active:scale-95 z-50"
          title="Waroeng Seblak 48 (Klik 5x untuk kelola akun)"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-xs">
            <Flame className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-extrabold text-xs text-stone-800 dark:text-stone-200 hidden sm:inline">
            {settings.storeName}
          </span>
          {secretClickCount > 0 && secretClickCount < 5 && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/50 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900 animate-pulse">
              {secretClickCount}/5
            </span>
          )}
        </button>

        {/* Tombol Mode Gelap/Terang */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="fixed top-4 right-4 p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 shadow-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
          title="Ganti Mode Tampilan"
        >
          {settings.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
          {/* Header Banner Login */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-6 text-white text-center space-y-2">
            <div
              onClick={handleSecretIconClick}
              className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mx-auto shadow-md border border-white/25 cursor-pointer active:scale-95 transition-transform"
              title="Klik 5x untuk Buka Manajemen Akun"
            >
              <Flame className="w-8 h-8 fill-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Portal Pengelola Warung
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                {settings.storeName}
              </h1>
              <p className="text-xs text-orange-100">
                Sistem Manajemen Stok Bahan &amp; Laporan Omset
              </p>
            </div>
          </div>

          {/* Form Login Admin */}
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
                Email / Username Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@seblak48.id"
                  disabled={rateLimit.isLocked}
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
              disabled={rateLimit.isLocked}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-99 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {rateLimit.isLocked
                  ? `Terkunci (${rateLimit.remainingSeconds}s)`
                  : 'Masuk ke Dashboard Admin'}
              </span>
            </button>
          </form>
        </div>

        {/* Modal Rahasia Manajemen Akun (Terbuka via klik icon 5x) */}
        <AccountManagementModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col lg:flex-row transition-colors duration-200">
      {/* Desktop Left Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        onToggleTheme={handleToggleTheme}
        onUpdateSettings={handleSaveSettings}
        onLogout={handleLogout}
        lowStockCount={lowStockCount}
        onLogoClick={handleSecretIconClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header Navigation */}
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          settings={settings}
          onToggleTheme={handleToggleTheme}
          onUpdateSettings={handleSaveSettings}
          onLogout={handleLogout}
          lowStockCount={lowStockCount}
          onLogoClick={handleSecretIconClick}
        />

        {/* View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {activeTab === 'beranda' && (
            <DashboardView
              ingredients={ingredients}
              transactions={transactions}
              menuItems={menuItems}
              onNavigateToTab={setActiveTab}
              onQuickRestock={handleQuickRestockFromDashboard}
              onSelectTransaction={(tx) => setReceiptTransaction(tx)}
            />
          )}

          {activeTab === 'stok' && (
            <InventoryView
              ingredients={ingredients}
              onSaveIngredient={handleSaveIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onAdjustStock={handleAdjustStock}
              targetQuickRestockId={targetQuickRestockId}
              onClearTargetQuickRestock={() => setTargetQuickRestockId(null)}
            />
          )}

          {activeTab === 'riwayat' && (
            <TransactionHistoryView
              transactions={transactions}
              onOpenReceipt={(tx) => setReceiptTransaction(tx)}
            />
          )}

          {activeTab === 'laporan' && (
            <SalesReportView
              transactions={transactions}
              menuItems={menuItems}
            />
          )}

          {activeTab === 'pengaturan' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onResetAllData={handleResetAllData}
            />
          )}
        </main>
      </div>

      {/* MODAL STRUK DIGITAL / CETAK STRUK */}
      <ReceiptModal
        transaction={receiptTransaction}
        settings={settings}
        onClose={() => setReceiptTransaction(null)}
      />

      {/* MODAL MANAJEMEN AKUN (Akses Rahasia via klik logo 5x) */}
      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
}
