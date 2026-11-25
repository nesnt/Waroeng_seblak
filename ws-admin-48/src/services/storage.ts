import {
  Ingredient,
  MenuItem,
  Transaction,
  StockLog,
  StoreSettings,
  StockStatus,
} from '../types';
import {
  INITIAL_INGREDIENTS,
  INITIAL_MENU_ITEMS,
  INITIAL_SETTINGS,
  INITIAL_STOCK_LOGS,
  INITIAL_TRANSACTIONS,
  TOPPING_OPTIONS,
} from '../data/dummyData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  DbIngredient,
  DbMenuItem,
  DbTransaction,
  DbStockLog,
  DbStoreSettings,
} from '../types/database';

const STORAGE_KEYS = {
  INGREDIENTS: 'seblak48_v2_ingredients',
  MENU_ITEMS: 'seblak48_v2_menu_items',
  TRANSACTIONS: 'seblak48_v3_transactions',
  STOCK_LOGS: 'seblak48_v2_stock_logs',
  SETTINGS: 'seblak48_v2_settings',
  UI_PREFS: 'seblak48_admin_ui_prefs',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Menghasilkan UUID v4 standar agar ID lokal & PostgreSQL selalu identik sejak dibuat
 */
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

function sanitizeCloudImageUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Jangan pernah menyimpan Base64 mentah ke kolom database cloud (mencegah bloat MB)
  if (trimmed.startsWith('data:')) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function getLocalUiPrefs(): { isDarkMode?: boolean; textScale?: StoreSettings['textScale'] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UI_PREFS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalUiPrefs(prefs: {
  isDarkMode?: boolean;
  textScale?: StoreSettings['textScale'];
}): void {
  try {
    const current = getLocalUiPrefs();
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage quota error
  }
}

export function clearSensitiveLocalCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.STOCK_LOGS);
  } catch {
    // Ignore error
  }
}

// Helper status calculator
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
    // Prioritaskan kolom category langsung agar hasil edit kategori tidak tertimpa relasi category_id lama
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

function mapFrontendIngredientToDb(ing: Ingredient): any {
  const isUuid = ing.id && UUID_REGEX.test(ing.id);
  const payload: any = {
    id: isUuid ? ing.id : generateUuid(),
    name: ing.name,
    category: ing.category,
    current_stock: ing.currentStock,
    unit: ing.unit,
    min_stock: ing.minStock,
    last_purchase_price: ing.lastPurchasePrice,
    image_url: sanitizeCloudImageUrl(ing.imageUrl),
    updated_at: new Date().toISOString(),
  };
  return payload;
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

function mapDbStockLogToFrontend(row: any): StockLog {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredients?.name || 'Bahan',
    date: row.created_at || new Date().toISOString(),
    type: row.type,
    amount: Number(row.amount ?? 0),
    unit: row.ingredients?.unit || 'pcs',
    note: row.note || '',
    balanceAfter: Number(row.balance_after ?? 0),
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
// ASYNC CLOUD API: Fungsi Interaksi Langsung ke Supabase PostgreSQL
// ============================================================================

export async function fetchIngredientsFromSupabase(): Promise<Ingredient[]> {
  if (!isSupabaseConfigured()) return getIngredients();
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*, categories(name)')
      .order('name', { ascending: true });

    if (error) {
      return getIngredients();
    }
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

export async function fetchStockLogsFromSupabase(ingredientId?: string): Promise<StockLog[]> {
  if (!isSupabaseConfigured()) return getStockLogs(ingredientId);
  try {
    let query = supabase
      .from('stock_logs')
      .select('*, ingredients(name, unit)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }

    const { data, error } = await query;
    if (error) return getStockLogs(ingredientId);
    if (Array.isArray(data)) {
      const mapped = data.map(mapDbStockLogToFrontend);
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(mapped));
      return mapped;
    }
    return getStockLogs(ingredientId);
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil stock logs:', err);
    return getStockLogs(ingredientId);
  }
}

export async function fetchTransactionsFromSupabase(limitCount = 1000): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return getTransactions();
  try {
    // 1. Coba query transaksi beserta item dan topping (batas ditingkatkan ke 1000 nota terbaru)
    let { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, transaction_item_toppings(*))')
      .order('created_at', { ascending: false })
      .limit(limitCount);

    // 2. Jika query relasi gagal karena masalah cache schema PostgREST, fallback ke query transaksi utama
    if (error || !data) {
      console.warn('⚠️ [Supabase] Join transaction_items gagal, mencoba query tabel transactions langsung:', error?.message);
      const simpleRes = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitCount);
      data = simpleRes.data;
      error = simpleRes.error;
    }

    if (error) {
      console.warn('⚠️ [Supabase] Gagal mengambil transactions dari Supabase:', error.message);
      return getTransactions();
    }

    if (Array.isArray(data)) {
      const mapped = data.map(mapDbTransactionToFrontend);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mapped));
      return mapped;
    }
    return getTransactions();
  } catch (err) {
    console.warn('⚠️ [Supabase] Gagal mengambil transactions:', err);
    return getTransactions();
  }
}

/**
 * Mengambil seluruh transaksi untuk 1 tahun penuh dari Supabase (agar Laporan Bulanan/Tahunan tidak terpotong)
 */
export async function fetchTransactionsByYearFromSupabase(year: number): Promise<Transaction[] | null> {
  if (!isSupabaseConfigured()) return null;
  const startIso = new Date(year, 0, 1, 0, 0, 0).toISOString();
  const endIso = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

  try {
    let { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, transaction_item_toppings(*))')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error || !data) {
      const simpleRes = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(5000);
      data = simpleRes.data;
      error = simpleRes.error;
    }

    if (error || !Array.isArray(data)) return null;
    return data.map(mapDbTransactionToFrontend);
  } catch {
    return null;
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
      const existingLocal = getSettings();
      const settings: StoreSettings = {
        storeName: data.store_name || existingLocal.storeName,
        slogan: data.slogan ?? existingLocal.slogan,
        address: data.address ?? existingLocal.address,
        phone: data.phone ?? existingLocal.phone,
        // Gunakan preferensi tampilan lokal per-perangkat jika sudah pernah diatur pengguna
        textScale: uiPrefs.textScale || data.text_scale || 'normal',
        isDarkMode: uiPrefs.isDarkMode !== undefined ? uiPrefs.isDarkMode : Boolean(data.is_dark_mode),
        userName: existingLocal.userName || 'Owner Waroeng',
        userRole: existingLocal.userRole || 'Administrator',
        userEmail: existingLocal.userEmail,
        userStatus: existingLocal.userStatus || 'Online',
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
// REALTIME SUBSCRIPTIONS (Live updates via WebSockets)
// ============================================================================

export function subscribeToIngredients(onUpdate: (ingredients: Ingredient[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_admin_ingredients')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, async () => {
      const updated = await fetchIngredientsFromSupabase();
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTransactions(onUpdate: (transactions: Transaction[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_admin_transactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
      const updated = await fetchTransactionsFromSupabase();
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToStockLogs(onUpdate: (logs: StockLog[]) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const channel = supabase
    .channel('realtime_admin_stock_logs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_logs' }, async () => {
      const updated = await fetchStockLogsFromSupabase();
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
    .channel('realtime_admin_menu_items')
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
// SYNCHRONOUS & HYBRID FUNCTIONS (Untuk UI Component Rendering & Local Cache)
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

export async function saveIngredient(ingredient: Ingredient): Promise<void> {
  const current = getIngredients();
  const normalizedId = ingredient.id && UUID_REGEX.test(ingredient.id) ? ingredient.id : generateUuid();
  const index = current.findIndex((i) => i.id === ingredient.id || i.id === normalizedId);
  const status = calculateStockStatus(ingredient.currentStock, ingredient.minStock);
  const safeImageUrl = sanitizeCloudImageUrl(ingredient.imageUrl) || undefined;
  const updatedItem: Ingredient = {
    ...ingredient,
    id: normalizedId,
    imageUrl: safeImageUrl,
    status,
    updatedAt: new Date().toISOString(),
  };

  let updatedList: Ingredient[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = updatedItem;
  } else {
    updatedList = [updatedItem, ...current];
  }

  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(updatedList));

  if (isSupabaseConfigured()) {
    const dbPayload = mapFrontendIngredientToDb(updatedItem);
    const { error } = await supabase.from('ingredients').upsert(dbPayload);
    if (error) console.error('⚠️ [Supabase] Gagal menyimpan bahan:', error);
  }
}

export async function deleteIngredient(id: string): Promise<void> {
  const current = getIngredients();
  const filtered = current.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(filtered));

  if (isSupabaseConfigured() && UUID_REGEX.test(id)) {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) console.error('⚠️ [Supabase] Gagal menghapus bahan:', error);
  }
}

export async function adjustStock(
  ingredientId: string,
  amountChange: number,
  type: 'masuk' | 'keluar',
  note: string
): Promise<{ success: boolean; newStock: number; message?: string }> {
  const ingredients = getIngredients();
  const index = ingredients.findIndex((i) => i.id === ingredientId);

  if (index === -1) {
    return { success: false, newStock: 0, message: 'Bahan tidak ditemukan' };
  }

  const ing = ingredients[index];
  let newStock = ing.currentStock;

  if (type === 'masuk') {
    newStock = Math.round((newStock + amountChange) * 100) / 100;
  } else {
    newStock = Math.max(0, Math.round((newStock - amountChange) * 100) / 100);
  }

  const status = calculateStockStatus(newStock, ing.minStock);
  const nowIso = new Date().toISOString();
  ingredients[index] = {
    ...ing,
    currentStock: newStock,
    status,
    updatedAt: nowIso,
  };

  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));

  const newLog: StockLog = {
    id: generateUuid(),
    ingredientId: ing.id,
    ingredientName: ing.name,
    date: nowIso,
    type,
    amount: amountChange,
    unit: ing.unit,
    note: note || (type === 'masuk' ? 'Penambahan stok manual' : 'Pengurangan stok manual'),
    balanceAfter: newStock,
  };

  addStockLog(newLog);

  // Tunggu sinkronisasi stok & log ke Supabase agar modal Riwayat selalu akurat seketika
  if (isSupabaseConfigured() && UUID_REGEX.test(ing.id)) {
    const [{ error: updErr }, { error: logErr }] = await Promise.all([
      supabase
        .from('ingredients')
        .update({ current_stock: newStock, updated_at: nowIso })
        .eq('id', ing.id),
      supabase.from('stock_logs').insert({
        ingredient_id: ing.id,
        type,
        amount: amountChange,
        balance_after: newStock,
        note: newLog.note,
      }),
    ]);

    if (updErr) console.error('⚠️ [Supabase] Gagal update stok bahan:', updErr);
    if (logErr) console.error('⚠️ [Supabase] Gagal mencatat stock log:', logErr);
  }

  return { success: true, newStock };
}

export function getStockLogs(ingredientId?: string): StockLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    if (raw !== null) {
      let logs: StockLog[] = JSON.parse(raw);
      if (ingredientId) {
        logs = logs.filter((l) => l.ingredientId === ingredientId);
      }
      return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    if (localStorage.getItem('seblak48_data_cleared') === 'true') {
      return [];
    }
    let logs: StockLog[] = [...INITIAL_STOCK_LOGS];
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
    if (ingredientId) {
      logs = logs.filter((l) => l.ingredientId === ingredientId);
    }
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error('Gagal membaca log stok:', e);
    return [];
  }
}

export function addStockLog(log: StockLog): void {
  const current = getStockLogs();
  const updated = [log, ...current];
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(updated));
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
  const normalizedId = menuItem.id && UUID_REGEX.test(menuItem.id) ? menuItem.id : generateUuid();
  const index = current.findIndex((m) => m.id === menuItem.id || m.id === normalizedId);
  const safeImageUrl = sanitizeCloudImageUrl(menuItem.imageUrl) || undefined;
  const normalizedMenu: MenuItem = {
    ...menuItem,
    id: normalizedId,
    imageUrl: safeImageUrl,
  };

  let updatedList: MenuItem[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = normalizedMenu;
  } else {
    updatedList = [normalizedMenu, ...current];
  }
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(updatedList));

  if (isSupabaseConfigured()) {
    const payload: any = {
      id: normalizedId,
      name: normalizedMenu.name,
      category: normalizedMenu.category,
      base_price: normalizedMenu.basePrice,
      description: normalizedMenu.description,
      image_url: safeImageUrl || null,
      stock: normalizedMenu.stock ?? 50,
      unit: normalizedMenu.unit || 'pcs',
      is_available: normalizedMenu.isAvailable,
    };
    const { error } = await supabase.from('menu_items').upsert(payload);
    if (error) console.error('⚠️ [Supabase] Gagal menyimpan menu item:', error);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const current = getMenuItems();
  const filtered = current.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filtered));

  if (isSupabaseConfigured() && UUID_REGEX.test(id)) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) console.error('⚠️ [Supabase] Gagal menghapus menu item:', error);
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

export function createTransaction(
  txData: Omit<Transaction, 'id' | 'invoiceNumber' | 'date' | 'status'>
): Transaction {
  const currentTransactions = getTransactions();
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const newInvoice = `TR-48-${Date.now().toString().slice(-4)}${randSuffix}`;
  const nowIso = new Date().toISOString();

  const newTransaction: Transaction = {
    ...txData,
    id: `tx-${Date.now()}`,
    invoiceNumber: newInvoice,
    date: nowIso,
    status: 'Selesai',
  };

  const updatedTransactions = [newTransaction, ...currentTransactions];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

  // Potong stok bahan secara lokal
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
        if (topDef && topDef.ingredientId && topDef.amountUsed) {
          const ingId = topDef.ingredientId;
          const totalAmount = topDef.amountUsed * item.quantity;
          if (!usageMap[ingId]) {
            usageMap[ingId] = { amount: 0, reason: [] };
          }
          usageMap[ingId].amount += totalAmount;
          usageMap[ingId].reason.push(`Topping ${top.name} x${item.quantity}`);
        }
      });
    }
  });

  let ingredientsModified = false;
  Object.keys(usageMap).forEach((ingId) => {
    const ingIdx = currentIngredients.findIndex((i) => i.id === ingId);
    if (ingIdx >= 0) {
      const usage = usageMap[ingId];
      const prevStock = currentIngredients[ingIdx].currentStock;
      const updatedStock = Math.max(0, Math.round((prevStock - usage.amount) * 100) / 100);

      currentIngredients[ingIdx].currentStock = updatedStock;
      currentIngredients[ingIdx].status = calculateStockStatus(
        updatedStock,
        currentIngredients[ingIdx].minStock
      );
      currentIngredients[ingIdx].updatedAt = nowIso;
      ingredientsModified = true;

      addStockLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ingredientId: ingId,
        ingredientName: currentIngredients[ingIdx].name,
        date: nowIso,
        type: 'keluar',
        amount: Math.round(usage.amount * 100) / 100,
        unit: currentIngredients[ingIdx].unit,
        note: `Transaksi ${newInvoice} (${usage.reason.join(', ')})`,
        balanceAfter: updatedStock,
      });
    }
  });

  if (ingredientsModified) {
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(currentIngredients));
  }

  // Potong stok minuman jika ada item minuman
  const currentMenuItems = getMenuItems();
  newTransaction.items.forEach((item) => {
    const mIdx = currentMenuItems.findIndex((m) => m.id === item.menuItemId || m.name === item.menuItemName);
    if (mIdx >= 0 && currentMenuItems[mIdx].category === 'Minuman') {
      const prevStock = currentMenuItems[mIdx].stock ?? 50;
      const newStock = Math.max(0, prevStock - item.quantity);
      currentMenuItems[mIdx].stock = newStock;
      currentMenuItems[mIdx].isAvailable = newStock > 0;
      saveMenuItem(currentMenuItems[mIdx]);
    }
  });

  // Kirim transaksi ke Supabase
  if (isSupabaseConfigured()) {
    const isDibungkus = newTransaction.notes && newTransaction.notes.toLowerCase().includes('dibungkus');
    supabase
      .from('transactions')
      .insert({
        invoice_number: newInvoice,
        customer_name: newTransaction.customerName || 'Pelanggan',
        dine_type: isDibungkus ? 'Dibungkus' : 'Makan di Sini',
        total_amount: Number(newTransaction.totalAmount) || 0,
        payment_method: newTransaction.paymentMethod || 'Tunai',
        cash_received: newTransaction.cashReceived != null ? Number(newTransaction.cashReceived) : Number(newTransaction.totalAmount) || 0,
        change_amount: newTransaction.change != null ? Number(newTransaction.change) : 0,
        status: newTransaction.status || 'Selesai',
        notes: newTransaction.notes || '',
      })
      .select('id')
      .single()
      .then(async ({ data: txRow, error }) => {
        if (error) {
          console.error('⚠️ [Supabase] Gagal menyimpan transaksi:', error.message);
          return;
        }
        if (txRow && newTransaction.items && newTransaction.items.length > 0) {
          for (const item of newTransaction.items) {
            const isMenuUuid = item.menuItemId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.menuItemId);
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
                const isTopUuid = top.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(top.id);
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
      });
  }

  return newTransaction;
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
 * Menyimpan pengaturan:
 * - Preferensi tampilan (isDarkMode, textScale) selalu disimpan per-perangkat di localStorage.
 * - Profil warung hanya disinkronkan ke tabel store_settings Supabase jika syncStoreProfile = true.
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
        if (error) console.error('⚠️ [Supabase] Gagal update store settings:', error);
      });
  }
}

export async function clearAllData(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
  localStorage.setItem('seblak48_data_cleared', 'true');

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('transaction_item_toppings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bowl_order_drinks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bowl_order_toppings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bowl_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('menu_recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('⚠️ Gagal menghapus sebagian data di Supabase:', err);
    }
  }
}

export function resetToDefaultData(): void {
  localStorage.removeItem('seblak48_data_cleared');
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
}
