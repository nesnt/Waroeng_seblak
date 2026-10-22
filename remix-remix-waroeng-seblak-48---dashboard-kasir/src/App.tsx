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
} from './services/storage';
import { CustomerOrderView } from './components/CustomerOrderView';
import { CashierRecordView } from './components/CashierRecordView';
import { LoginView } from './components/LoginView';

type AppPage = 'login' | 'customer_order' | 'cashier_record';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('login');
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => getIngredients());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [settings, setSettings] = useState<StoreSettings>(() => getSettings());

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
  }, []);

  const handleToggleTheme = () => {
    const updated = {
      ...settings,
      isDarkMode: !settings.isDarkMode,
    };
    saveSettings(updated);
    setSettings(updated);
  };

  if (currentPage === 'login') {
    return (
      <LoginView
        settings={settings}
        onToggleTheme={handleToggleTheme}
        onOpenCustomerOrder={() => {
          refreshData();
          setCurrentPage('customer_order');
        }}
        onOpenCashierRecord={() => {
          refreshData();
          setCurrentPage('cashier_record');
        }}
      />
    );
  }

  if (currentPage === 'cashier_record') {
    return (
      <CashierRecordView
        settings={settings}
        ingredients={ingredients}
        menuItems={menuItems}
        onToggleTheme={handleToggleTheme}
        onBackToLogin={() => setCurrentPage('login')}
        onOpenCustomerOrder={() => {
          refreshData();
          setCurrentPage('customer_order');
        }}
        onOrderCreated={refreshData}
      />
    );
  }

  return (
    <CustomerOrderView
      settings={settings}
      ingredients={ingredients}
      menuItems={menuItems}
      onToggleTheme={handleToggleTheme}
      onBackToLogin={() => setCurrentPage('login')}
      onOpenCashier={() => {
        refreshData();
        setCurrentPage('cashier_record');
      }}
      onOrderCreated={refreshData}
    />
  );
}

