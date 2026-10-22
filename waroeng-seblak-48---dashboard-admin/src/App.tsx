/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from './services/storage';
import { DesktopSidebar, MobileNavigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import { SalesReportView } from './components/SalesReportView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { Flame, Lock, Mail, LogIn, Eye, EyeOff, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function App() {
  // Application Data States
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => getIngredients());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions());
  const [settings, setSettings] = useState<StoreSettings>(() => getSettings());

  // UI Navigation & Modals State (Default false agar masuk ke halaman Login Dummy terlebih dahulu)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('owner@seblak48.id');
  const [loginPassword, setLoginPassword] = useState<string>('seblak48');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('beranda');
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [targetQuickRestockId, setTargetQuickRestockId] = useState<string | null>(null);

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

  // Low stock counter for badges
  const lowStockCount = useMemo(() => {
    return ingredients.filter((i) => i.currentStock <= i.minStock).length;
  }, [ingredients]);

  // HALAMAN LOGIN DUMMY (Tampil pertama kali sebelum masuk ke Dashboard)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 relative transition-colors duration-200">
        {/* Tombol Mode Gelap/Terang di Pojok Kanan Atas Login */}
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
          <div className="bg-linear-to-r from-orange-600 via-amber-600 to-red-600 p-6 text-white text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mx-auto shadow-md border border-white/25">
              <Flame className="w-8 h-8 fill-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Portal Admin Warung
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                {settings.storeName}
              </h1>
              <p className="text-xs text-orange-100">
                Sistem Manajemen Stok Bahan &amp; Laporan Omset
              </p>
            </div>
          </div>

          {/* Form Login Dummy */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (loginEmail.trim()) {
                handleSaveSettings({
                  ...settings,
                  userEmail: loginEmail.trim(),
                });
              }
              setIsLoggedIn(true);
            }}
            className="p-6 space-y-4"
          >
            {/* Info Akun Dummy */}
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/60 text-xs space-y-1">
              <div className="font-extrabold text-orange-800 dark:text-orange-300 flex items-center justify-between">
                <span>Akun Demo (Siap Pakai):</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-200/70 dark:bg-orange-900/70 text-orange-900 dark:text-orange-200">
                  Owner
                </span>
              </div>
              <p className="text-[11px] text-orange-700 dark:text-orange-300/90">
                Email &amp; kata sandi sudah terisi otomatis. Klik tombol <strong>Masuk ke Dashboard</strong> di bawah untuk langsung masuk.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                Email / Username Pengelola
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Masukkan email pengelola..."
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
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
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  title={showPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-99 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Dashboard</span>
            </button>
          </form>
        </div>
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
        onLogout={() => setIsLoggedIn(false)}
        lowStockCount={lowStockCount}
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
          onLogout={() => setIsLoggedIn(false)}
          lowStockCount={lowStockCount}
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
              menuItems={menuItems}
              ingredients={ingredients}
              onSaveSettings={handleSaveSettings}
              onSaveMenuItem={handleSaveMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
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
    </div>
  );
}
