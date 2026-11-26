import {
  Ingredient,
  MenuItem,
  Transaction,
  StockLog,
  StoreSettings,
  StockStatus,
  BowlOrder,
} from '../types';
import {
  INITIAL_INGREDIENTS,
  INITIAL_MENU_ITEMS,
  INITIAL_SETTINGS,
  INITIAL_STOCK_LOGS,
  INITIAL_BOWL_ORDERS,
  INITIAL_TRANSACTIONS,
  TOPPING_OPTIONS,
} from '../data/dummyData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  INGREDIENTS: 'seblak48_v2_ingredients',
  MENU_ITEMS: 'seblak48_v2_menu_items',
  TRANSACTIONS: 'seblak48_v3_transactions',
  STOCK_LOGS: 'seblak48_v2_stock_logs',
  SETTINGS: 'seblak48_v2_settings',
  BOWL_ORDERS: 'seblak48_v2_bowl_orders',
  UI_PREFS: 'seblak48_uc_ui_prefs',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getLocalUiPrefs(): { isDarkMode?: boolean; textScale?: StoreSettings['textScale'] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UI_PREFS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUiPrefs(prefs: {
  isDarkMode?: boolean;
  textScale?: StoreSettings['textScale'];
}): void {
  try {
    const current = getLocalUiPrefs();
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage error
  }
}

export function calculateStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock <= 0) return 'habis';
  if (currentStock <= minStock) return 'menipis';
  return 'aman';
}

// ============================================================================
// MAPPERS: Konversi Format Supabase (snake_case) <-> Frontend (camelCase)
// ============================================================================

function mapDbIngredientToFrontend(row: any): Ingredient {
  const currentStock = Number(row.current_stock ?? 0);
  const minStock = Number(row.min_stock ?? 20);
  return {
    id: row.id,
    name: row.name,
    category: (row.category || row.categories?.name || 'Kerupuk') as any,
    currentStock,
    unit: row.unit || 'pcs',
    minStock,
    lastPurchasePrice: Number(row.last_purchase_price ?? 0),
    status: row.status || calculateStockStatus(currentStock, minStock),
    updatedAt: row.updated_at || new Date().toISOString(),
    imageUrl: row.image_url || undefined,
  };
}

function mapDbMenuItemToFrontend(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: (row.category || row.categories?.name || 'Seblak') as any,
    basePrice: Number(row.base_price ?? 0),
    description: row.description || '',
    isAvailable: row.is_available ?? true,
    imageUrl: row.image_url || undefined,
    stock: Number(row.stock ?? row.current_stock ?? 50),
    unit: row.unit || 'pcs',
    recipe: (row.menu_recipes || []).map((r: any) => ({
      ingredientId: r.ingredient_id,
      amount: Number(r.amount_needed ?? 1),
      unit: r.unit || 'pcs',
    })),
  };
}

function mapDbBowlOrderToFrontend(row: any): BowlOrder {
  const drinks = (row.bowl_order_drinks || []).map((d: any) => ({
    id: d.menu_item_id || d.id,
    name: d.name || d.menu_items?.name || 'Minuman',
    price: Number(d.price ?? d.menu_items?.base_price ?? 5000),
    qty: Number(d.qty ?? 1),
  }));

  return {
    id: row.id,
    bowlNumber: row.bowl_number,
    customerName: row.customer_name,
    dineType: row.dine_type || 'Makan di Sini',
    spicyLevel: Number(row.spicy_level ?? 2),
    spicyRequestText: row.spicy_request_text || undefined,
    brothType: row.broth_type || 'Asin Manis',
    notes: row.notes || undefined,
    drinks,
    createdAt: row.created_at || new Date().toISOString(),
    status: row.status === 'selesai' ? 'selesai' : 'menunggu_hitung',
    invoiceNumber: row.invoice_number || undefined,
  };
}

function mapDbTransactionToFrontend(row: any): Transaction {
  const items = (row.transaction_items || []).map((it: any) => ({
    menuItemId: it.menu_item_id || 'menu-prasmanan',
    menuItemName: it.menu_name || it.menu_items?.name || 'Paket Seblak Prasmanan',
    quantity: Number(it.quantity ?? 1),
    price: Number(it.base_price ?? 0),
    levelPedas: Number(it.spicy_level ?? 0),
    toppings: (it.transaction_item_toppings || []).map((tp: any) => ({
      id: tp.topping_id || 'top-custom',
      name: tp.topping_name || tp.topping_options?.name || 'Topping',
      price: Number(tp.price ?? 0),
    })),
    subtotal: Number(it.subtotal ?? 0),
    notes: it.item_notes || '',
  }));

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.created_at || new Date().toISOString(),
    customerName: row.customer_name || undefined,
    items,
    totalAmount: Number(row.total_amount ?? 0),
    paymentMethod: row.payment_method || 'Tunai',
    cashReceived: row.cash_received != null ? Number(row.cash_received) : undefined,
    change: row.change_amount != null ? Number(row.change_amount) : undefined,
    status: row.status || 'Selesai',
    notes: row.notes || undefined,
  };
}

// ============================================================================
// ASYNC CLOUD API: Interaksi Langsung ke Supabase PostgreSQL
// ============================================================================

export async function fetchIngredientsFromSupabase(): Promise<Ingredient[]> {
  if (!isSupabaseConfigured()) return getIngredients();
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*, categories(name)')
      .order('name', { ascending: true });

    if (error) return getIngredients();
    if (Array.isArray(data)) {
      const mapped = data.map(mapDbIngredientToFrontend);
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(mapped));
      return mapped;
    }
    return getIngredients();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil bahan:', err);
    return getIngredients();
  }
}

export async function fetchMenuItemsFromSupabase(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured()) return getMenuItems();
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name), menu_recipes(*)')
      .order('name', { ascending: true });

    if (error) return getMenuItems();
    if (Array.isArray(data)) {
      const mapped = data.map(mapDbMenuItemToFrontend);
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(mapped));
      return mapped;
    }
    return getMenuItems();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil menu items:', err);
    return getMenuItems();
  }
}

export async function fetchBowlOrdersFromSupabase(): Promise<BowlOrder[]> {
  if (!isSupabaseConfigured()) return getBowlOrders();
  try {
    const { data, error } = await supabase
      .from('bowl_orders')
      .select('*, bowl_order_drinks(*, menu_items(name, base_price))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    if (data) {
      const mapped = data.map(mapDbBowlOrderToFrontend);
      localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(mapped));
      return mapped;
    }
    return getBowlOrders();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil antrian mangkuk:', err);
    return getBowlOrders();
  }
}

export async function fetchTransactionsFromSupabase(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return getTransactions();
  try {
    let { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, transaction_item_toppings(*))')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      const fallback = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    if (data) {
      const mapped = data.map(mapDbTransactionToFrontend);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mapped));
      return mapped;
    }
    return getTransactions();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil riwayat transaksi:', err);
    return getTransactions();
  }
}

export async function fetchSettingsFromSupabase(): Promise<StoreSettings> {
  if (!isSupabaseConfigured()) return getSettings();
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const uiPrefs = getLocalUiPrefs();
      const settings: StoreSettings = {
        storeName: data.store_name,
        slogan: data.slogan,
        address: data.address,
        phone: data.phone,
        textScale: uiPrefs.textScale || data.text_scale || 'normal',
        isDarkMode: uiPrefs.isDarkMode !== undefined ? uiPrefs.isDarkMode : Boolean(data.is_dark_mode),
        userName: 'Petugas Kasir 48',
        userRole: 'Kasir Utama',
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return settings;
    }
    return getSettings();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil store settings:', err);
    return getSettings();
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS: Push update instan untuk Kasir & Pelanggan
// ============================================================================

export function subscribeToBowlOrders(onUpdate: (orders: BowlOrder[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_cashier_bowl_orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bowl_orders' }, async () => {
      const updated = await fetchBowlOrdersFromSupabase();
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToIngredients(onUpdate: (ingredients: Ingredient[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_cashier_ingredients')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, async () => {
      const updated = await fetchIngredientsFromSupabase();
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMenuItems(onUpdate: (menus: MenuItem[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_uc_menu_items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
      const updated = await fetchMenuItemsFromSupabase();
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// SYNCHRONOUS & HYBRID FUNCTIONS (Untuk UI Component Rendering & Cloud Sync)
// ============================================================================

export function getIngredients(): Ingredient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    if (localStorage.getItem('seblak48_data_cleared') === 'true') {
      return [];
    }
    const initial = [...INITIAL_INGREDIENTS];
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.error('Gagal membaca data bahan:', e);
    return [];
  }
}

export function getMenuItems(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    if (localStorage.getItem('seblak48_data_cleared') === 'true') {
      return [];
    }
    const initial = [...INITIAL_MENU_ITEMS];
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.error('Gagal membaca data menu:', e);
    return [];
  }
}

export async function saveMenuItem(menuItem: MenuItem): Promise<void> {
  const current = getMenuItems();
  const index = current.findIndex((m) => m.id === menuItem.id);
  let updatedList: MenuItem[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = menuItem;
  } else {
    updatedList = [menuItem, ...current];
  }
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(updatedList));

  if (isSupabaseConfigured() && UUID_REGEX.test(menuItem.id)) {
    const { error } = await supabase
      .from('menu_items')
      .update({
        stock: menuItem.stock ?? 50,
        is_available: menuItem.isAvailable,
      })
      .eq('id', menuItem.id);
    if (error) console.error('⚠️ [Supabase] Gagal update stok minuman:', error);
  }
}

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    if (localStorage.getItem('seblak48_data_cleared') === 'true') {
      return [];
    }
    const initial = [...INITIAL_TRANSACTIONS];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.error('Gagal membaca transaksi:', e);
    return [];
  }
}

/**
 * Mencatat transaksi resmi Kasir ke Supabase Cloud, sekaligus memotong stok bahan/topping
 * di tabel `ingredients`, mencatat mutasi `stock_logs`, dan memotong stok `menu_items` minuman.
 */
export async function createTransaction(
  txData: Omit<Transaction, 'id' | 'invoiceNumber' | 'date' | 'status'>
): Promise<Transaction> {
  const currentTransactions = getTransactions();
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const newInvoice = `TR-48-${Date.now().toString().slice(-4)}${randSuffix}`;
  const nowIso = new Date().toISOString();
  const newTxUuid = generateUuid();

  const newTransaction: Transaction = {
    ...txData,
    id: newTxUuid,
    invoiceNumber: newInvoice,
    date: nowIso,
    status: 'Selesai',
  };

  const updatedTransactions = [newTransaction, ...currentTransactions];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

  // 1. Hitung pemakaian bahan baku / topping dari resep & topping prasmanan yang dipilih Kasir
  const currentIngredients = getIngredients();
  const menuMap = new Map(getMenuItems().map((m) => [m.id, m]));
  const toppingMap = new Map(TOPPING_OPTIONS.map((t) => [t.id, t]));

  const usageMap: { [ingredientId: string]: { amount: number; reason: string[] } } = {};

  newTransaction.items.forEach((item) => {
    const menu = menuMap.get(item.menuItemId);
    if (menu && menu.recipe && menu.recipe.length > 0) {
      menu.recipe.forEach((recipeItem) => {
        const totalAmount = recipeItem.amount * item.quantity;
        if (!usageMap[recipeItem.ingredientId]) {
          usageMap[recipeItem.ingredientId] = { amount: 0, reason: [] };
        }
        usageMap[recipeItem.ingredientId].amount += totalAmount;
        usageMap[recipeItem.ingredientId].reason.push(`${menu.name} x${item.quantity}`);
      });
    }

    if (item.toppings && item.toppings.length > 0) {
      item.toppings.forEach((top) => {
        const topDef = toppingMap.get(top.id);
        const resolvedIngId =
          top.ingredientId ||
          topDef?.ingredientId ||
          (top.id.startsWith('top-') ? top.id.slice(4) : undefined);
        const amountPerUnit = topDef?.amountUsed ?? 1;

        if (resolvedIngId) {
          const totalAmount = amountPerUnit * item.quantity;
          if (!usageMap[resolvedIngId]) {
            usageMap[resolvedIngId] = { amount: 0, reason: [] };
          }
          usageMap[resolvedIngId].amount += totalAmount;
          if (!usageMap[resolvedIngId].reason.includes(top.name)) {
            usageMap[resolvedIngId].reason.push(top.name);
          }
        }
      });
    }
  });

  // Terapkan pemotongan stok bahan secara lokal & kumpulkan operasi sinkronisasi Supabase
  let ingredientsModified = false;
  const cloudIngredientUpdates: Array<{
    ingId: string;
    updatedStock: number;
    deductedAmount: number;
    note: string;
  }> = [];

  Object.keys(usageMap).forEach((ingId) => {
    const ingIdx = currentIngredients.findIndex((i) => i.id === ingId);
    if (ingIdx >= 0) {
      const usage = usageMap[ingId];
      const prevStock = currentIngredients[ingIdx].currentStock;
      const deductedAmount = Math.round(usage.amount * 100) / 100;
      const updatedStock = Math.max(0, Math.round((prevStock - deductedAmount) * 100) / 100);

      currentIngredients[ingIdx].currentStock = updatedStock;
      currentIngredients[ingIdx].status = calculateStockStatus(
        updatedStock,
        currentIngredients[ingIdx].minStock
      );
      currentIngredients[ingIdx].updatedAt = nowIso;
      ingredientsModified = true;

      cloudIngredientUpdates.push({
        ingId,
        updatedStock,
        deductedAmount,
        note: `Transaksi ${newInvoice} (${usage.reason.join(', ')})`,
      });
    }
  });

  if (ingredientsModified) {
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(currentIngredients));
  }

  // 2. Potong stok minuman jika ada item minuman pada transaksi kasir
  const currentMenuItems = getMenuItems();
  const drinkSyncPromises: Promise<void>[] = [];
  newTransaction.items.forEach((item) => {
    const mIdx = currentMenuItems.findIndex(
      (m) => m.id === item.menuItemId || m.name === item.menuItemName
    );
    if (mIdx >= 0 && currentMenuItems[mIdx].category === 'Minuman') {
      const prevStock = currentMenuItems[mIdx].stock ?? 50;
      const newStock = Math.max(0, prevStock - item.quantity);
      currentMenuItems[mIdx].stock = newStock;
      currentMenuItems[mIdx].isAvailable = newStock > 0;
      drinkSyncPromises.push(saveMenuItem(currentMenuItems[mIdx]));
    }
  });

  // 3. Simpan transaksi beserta pemotongan stok bahan & log mutasi ke Supabase Cloud
  if (isSupabaseConfigured()) {
    try {
      const isDibungkus =
        newTransaction.notes && newTransaction.notes.toLowerCase().includes('dibungkus');

      const { data: txRow, error: txErr } = await supabase
        .from('transactions')
        .insert({
          id: newTxUuid,
          invoice_number: newInvoice,
          customer_name: newTransaction.customerName || 'Pelanggan',
          dine_type: isDibungkus ? 'Dibungkus' : 'Makan di Sini',
          total_amount: Number(newTransaction.totalAmount) || 0,
          payment_method: newTransaction.paymentMethod || 'Tunai',
          cash_received:
            newTransaction.cashReceived != null
              ? Number(newTransaction.cashReceived)
              : Number(newTransaction.totalAmount) || 0,
          change_amount: newTransaction.change != null ? Number(newTransaction.change) : 0,
          status: newTransaction.status || 'Selesai',
          notes: newTransaction.notes || '',
        })
        .select('id')
        .single();

      if (txErr) {
        console.error('⚠️ [Supabase] Gagal menyimpan transaksi kasir:', txErr.message);
      } else if (txRow && newTransaction.items && newTransaction.items.length > 0) {
        for (const item of newTransaction.items) {
          const isMenuUuid = item.menuItemId && UUID_REGEX.test(item.menuItemId);
          const { data: itemRow, error: itemErr } = await supabase
            .from('transaction_items')
            .insert({
              transaction_id: txRow.id,
              menu_item_id: isMenuUuid ? item.menuItemId : null,
              menu_name: item.menuItemName,
              quantity: Number(item.quantity) || 1,
              base_price: Number(item.price) || 0,
              spicy_level: Math.min(6, Math.max(0, Number(item.levelPedas) || 0)),
              subtotal: Number(item.subtotal) || 0,
              item_notes: item.notes || '',
            })
            .select('id')
            .single();

          if (!itemErr && itemRow && item.toppings && item.toppings.length > 0) {
            const toppingInserts = item.toppings.map((top) => {
              const isTopUuid = top.id && UUID_REGEX.test(top.id);
              return {
                transaction_item_id: itemRow.id,
                topping_id: isTopUuid ? top.id : null,
                price: Number(top.price) || 0,
                quantity: 1,
              };
            });
            await supabase.from('transaction_item_toppings').insert(toppingInserts);
          }
        }
      }

      // Update stok bahan di tabel `ingredients` & catat mutasi keluar di `stock_logs`
      if (cloudIngredientUpdates.length > 0) {
        await Promise.all(
          cloudIngredientUpdates
            .filter((u) => UUID_REGEX.test(u.ingId))
            .map(async (u) => {
              await supabase
                .from('ingredients')
                .update({ current_stock: u.updatedStock, updated_at: nowIso })
                .eq('id', u.ingId);

              await supabase.from('stock_logs').insert({
                ingredient_id: u.ingId,
                transaction_id: txErr ? null : newTxUuid,
                type: 'keluar',
                amount: u.deductedAmount,
                balance_after: u.updatedStock,
                note: u.note,
              });
            })
        );
      }

      await Promise.all(drinkSyncPromises);
    } catch (err) {
      console.error('⚠️ [Supabase] Terjadi kesalahan saat sinkronisasi checkout kasir:', err);
    }
  }

  return newTransaction;
}

export function getStockLogs(): StockLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    return raw ? JSON.parse(raw) : INITIAL_STOCK_LOGS;
  } catch (e) {
    console.error('Gagal membaca log stok:', e);
    return INITIAL_STOCK_LOGS;
  }
}

export function getSettings(): StoreSettings {
  try {
    const uiPrefs = getLocalUiPrefs();
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      const merged = {
        ...INITIAL_SETTINGS,
        isDarkMode: uiPrefs.isDarkMode ?? INITIAL_SETTINGS.isDarkMode,
        textScale: uiPrefs.textScale ?? INITIAL_SETTINGS.textScale,
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return merged;
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      isDarkMode: uiPrefs.isDarkMode ?? parsed.isDarkMode,
      textScale: uiPrefs.textScale ?? parsed.textScale,
    };
  } catch (e) {
    console.error('Gagal membaca pengaturan:', e);
    return INITIAL_SETTINGS;
  }
}

/**
 * Preferensi mode gelap & ukuran teks disimpan lokal per perangkat (tidak mengubah store_settings global)
 */
export function saveSettings(settings: StoreSettings, syncStoreProfile = false): void {
  saveLocalUiPrefs({
    isDarkMode: settings.isDarkMode,
    textScale: settings.textScale,
  });
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

  if (syncStoreProfile && isSupabaseConfigured()) {
    supabase
      .from('store_settings')
      .upsert({
        id: 1,
        store_name: settings.storeName,
        slogan: settings.slogan,
        address: settings.address,
        phone: settings.phone,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal update settings:', error);
      });
  }
}

// ==================== ANTREAN MANGKUK PEMBELI ====================

export function getBowlOrders(): BowlOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOWL_ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(INITIAL_BOWL_ORDERS));
      return INITIAL_BOWL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca data pesanan mangkuk:', e);
    return INITIAL_BOWL_ORDERS;
  }
}

/**
 * Mengirim antrean mangkuk pelanggan ke tabel `bowl_orders` & `bowl_order_drinks` di Supabase.
 * TIDAK membuat transaksi keuangan sebelum Kasir menghitung topping & menerima pembayaran!
 */
export async function addBowlOrder(
  orderData: Omit<BowlOrder, 'id' | 'createdAt' | 'status'>
): Promise<BowlOrder> {
  const current = getBowlOrders();
  const bowlUuid = generateUuid();
  const queueCode =
    orderData.invoiceNumber ||
    `ANT-48-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

  const newOrder: BowlOrder = {
    ...orderData,
    id: bowlUuid,
    invoiceNumber: queueCode,
    createdAt: new Date().toISOString(),
    status: 'menunggu_hitung',
  };

  const filtered = current.filter(
    (b) =>
      !(
        b.bowlNumber.toLowerCase() === newOrder.bowlNumber.toLowerCase() &&
        b.status === 'menunggu_hitung'
      )
  );
  const updated = [newOrder, ...filtered];
  localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('bowl_orders')
        .insert({
          id: bowlUuid,
          bowl_number: newOrder.bowlNumber.slice(0, 20),
          customer_name: newOrder.customerName.slice(0, 100),
          dine_type: newOrder.dineType,
          spicy_level: Math.min(6, Math.max(0, Number(newOrder.spicyLevel) || 0)),
          spicy_request_text: newOrder.spicyRequestText
            ? newOrder.spicyRequestText.slice(0, 150)
            : null,
          broth_type: newOrder.brothType,
          notes: newOrder.notes ? newOrder.notes.slice(0, 300) : null,
          status: 'menunggu_hitung',
          invoice_number: queueCode,
        })
        .select('id')
        .single();

      if (error) {
        console.error('⚠️ [Supabase] Gagal menyimpan bowl_order:', error);
      } else if (data && newOrder.drinks && newOrder.drinks.length > 0) {
        const drinkRows = newOrder.drinks.map((d) => {
          const isMenuUuid = d.id && UUID_REGEX.test(d.id);
          return {
            bowl_order_id: data.id,
            menu_item_id: isMenuUuid ? d.id : null,
            name: d.name.slice(0, 100),
            price: Number(d.price) || 0,
            qty: Math.max(1, Number(d.qty) || 1),
          };
        });
        const { error: drinkErr } = await supabase.from('bowl_order_drinks').insert(drinkRows);
        if (drinkErr) console.error('⚠️ [Supabase] Gagal menyimpan bowl drinks:', drinkErr);
      }
    } catch (err) {
      console.error('⚠️ [Supabase] Error saat mengirim antrean mangkuk:', err);
    }
  }

  return newOrder;
}

export async function completeBowlOrder(
  id: string,
  invoiceNumber?: string,
  transactionId?: string
): Promise<void> {
  const current = getBowlOrders();
  const updated = current.map((b) =>
    b.id === id
      ? { ...b, status: 'selesai' as const, invoiceNumber: invoiceNumber || b.invoiceNumber }
      : b
  );
  localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(updated));

  if (isSupabaseConfigured() && UUID_REGEX.test(id)) {
    const updatePayload: Record<string, any> = {
      status: 'selesai',
    };
    if (invoiceNumber) updatePayload.invoice_number = invoiceNumber;
    if (transactionId && UUID_REGEX.test(transactionId)) {
      updatePayload.transaction_id = transactionId;
    }

    const { error } = await supabase.from('bowl_orders').update(updatePayload).eq('id', id);
    if (error) console.error('⚠️ [Supabase] Gagal update status bowl_orders:', error);
  }
}
