/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from './services/storage';
import { CustomerOrderView } from './components/CustomerOrderView';
import { CashierRecordView } from './components/CashierRecordView';
import { LoginView } from './components/LoginView';

export default function App() {
  // Routing: URL Path State (Default root '/' adalah Layanan Pemesanan Mandiri Pelanggan)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Sesi Login Kasir (tersimpan di sessionStorage perangkat)
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('seblak48_cashier_session') === 'true';
  });

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

  // Helper navigasi URL tanpa reload halaman
  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  // Ambil data live dari Supabase & langganan perubahan stok bahan secara realtime
  useEffect(() => {
    fetchIngredientsFromSupabase().then(setIngredients);
    fetchMenuItemsFromSupabase().then(setMenuItems);
    fetchSettingsFromSupabase().then(setSettings);

    const unsub = subscribeToIngredients(setIngredients);
    return () => {
      unsub();
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

  const handleToggleTheme = () => {
    const updated = {
      ...settings,
      isDarkMode: !settings.isDarkMode,
    };
    saveSettings(updated);
    setSettings(updated);
  };

  // Cek apakah user sedang mengakses direktori /kasir
  const isKasirRoute = currentPath.toLowerCase().startsWith('/kasir');

  // 1. Jika rute adalah /kasir
  if (isKasirRoute) {
    // Jika belum login sebagai kasir -> tampilkan LoginView (Portal Login Kasir ber-cooldown)
    if (!isCashierLoggedIn) {
      return (
        <LoginView
          settings={settings}
          onToggleTheme={handleToggleTheme}
          onBackToCustomerOrder={() => navigateTo('/')}
          onLoginSuccess={() => {
            sessionStorage.setItem('seblak48_cashier_session', 'true');
            setIsCashierLoggedIn(true);
            refreshData();
          }}
        />
      );
    }

    // Jika sudah login sebagai kasir -> tampilkan CashierRecordView
    return (
      <CashierRecordView
        settings={settings}
        ingredients={ingredients}
        menuItems={menuItems}
        onToggleTheme={handleToggleTheme}
        onBackToLogin={() => {
          sessionStorage.removeItem('seblak48_cashier_session');
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
      onOpenCashier={() => {
        refreshData();
        navigateTo('/kasir');
      }}
      onOrderCreated={refreshData}
    />
  );
}
