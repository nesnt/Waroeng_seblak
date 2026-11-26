/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Ingredient,
  MenuItem,
  StoreSettings,
} from './types';
import {
  getIngredients,
  getMenuItems,
  getSettings,
  saveSettings,
  fetchIngredientsFromSupabase,
  fetchMenuItemsFromSupabase,
  fetchSettingsFromSupabase,
  subscribeToIngredients,
  subscribeToMenuItems,
} from './services/storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { checkCashierSession, logoutCashier } from './services/cashierAuth';
import { CustomerOrderView } from './components/CustomerOrderView';
import { CashierRecordView } from './components/CashierRecordView';
import { LoginView } from './components/LoginView';

export default function App() {
  // Routing: URL Path State (Default root '/' adalah Layanan Pemesanan Mandiri Pelanggan)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Sesi Login Kasir: tervalidasi melalui JWT Supabase Auth (bukan sessionStorage mentah)
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => getIngredients());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [settings, setSettings] = useState<StoreSettings>(() => getSettings());

  // Listen perubahan URL dari tombol Back/Forward browser
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Validasi sesi kasir saat pertama dimuat & pantau perubahan status auth Supabase
  useEffect(() => {
    let mounted = true;
    checkCashierSession()
      .then((res) => {
        if (mounted) {
          setIsCashierLoggedIn(res.isAuthenticated);
        }
      })
      .finally(() => {
        if (mounted) setIsCheckingAuth(false);
      });

    let authSub: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (mounted) setIsCashierLoggedIn(false);
        }
      });
      authSub = data.subscription;
    }

    return () => {
      mounted = false;
      authSub?.unsubscribe();
    };
  }, []);

  // Helper navigasi URL tanpa reload halaman
  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  // Ambil katalog publik (bahan, menu, profil warung) & langganan perubahan ketersediaan stok realtime
  useEffect(() => {
    fetchIngredientsFromSupabase().then(setIngredients);
    fetchMenuItemsFromSupabase().then(setMenuItems);
    fetchSettingsFromSupabase().then(setSettings);

    const unsubIng = subscribeToIngredients(setIngredients);
    const unsubMenu = subscribeToMenuItems(setMenuItems);
    return () => {
      unsubIng();
      unsubMenu();
    };
  }, []);

  useEffect(() => {
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.body.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
    document.body.classList.add(`text-scale-${settings.textScale}`);
  }, [settings.isDarkMode, settings.textScale]);

  const refreshData = useCallback(() => {
    setIngredients(getIngredients());
    setMenuItems(getMenuItems());
    setSettings(getSettings());
    fetchIngredientsFromSupabase().then(setIngredients);
    fetchMenuItemsFromSupabase().then(setMenuItems);
  }, []);

  // Simpan preferensi tema secara lokal di perangkat pengunjung (tidak menimpa store_settings global)
  const handleToggleTheme = () => {
    const updated = {
      ...settings,
      isDarkMode: !settings.isDarkMode,
    };
    saveSettings(updated, false);
    setSettings(updated);
  };

  // Cek apakah user sedang mengakses direktori /kasir
  const isKasirRoute = currentPath.toLowerCase().startsWith('/kasir');

  // 1. Jika rute adalah /kasir
  if (isKasirRoute) {
    if (isCheckingAuth) {
      return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-xs font-bold text-stone-500 dark:text-stone-400">
            Memverifikasi sesi petugas kasir...
          </p>
        </div>
      );
    }

    if (!isCashierLoggedIn) {
      return (
        <LoginView
          settings={settings}
          onToggleTheme={handleToggleTheme}
          onBackToCustomerOrder={() => navigateTo('/')}
          onLoginSuccess={() => {
            setIsCashierLoggedIn(true);
            refreshData();
          }}
        />
      );
    }

    return (
      <CashierRecordView
        settings={settings}
        ingredients={ingredients}
        menuItems={menuItems}
        onToggleTheme={handleToggleTheme}
        onBackToLogin={async () => {
          await logoutCashier();
          setIsCashierLoggedIn(false);
        }}
        onOpenCustomerOrder={() => {
          refreshData();
          navigateTo('/');
        }}
        onOrderCreated={refreshData}
      />
    );
  }

  // 2. Default route ('/' atau rute pemesanan): Langsung buka layar pemesanan pelanggan
  return (
    <CustomerOrderView
      settings={settings}
      ingredients={ingredients}
      menuItems={menuItems}
      onToggleTheme={handleToggleTheme}
      onOrderCreated={refreshData}
    />
  );
}
