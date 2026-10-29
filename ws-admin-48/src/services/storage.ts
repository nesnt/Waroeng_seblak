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
};

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
    category: (row.categories?.name || row.category || 'Kerupuk') as any,
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
  const isUuid = ing.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ing.id);
  const payload: any = {
    name: ing.name,
    category: ing.category,
    current_stock: ing.currentStock,
    unit: ing.unit,
    min_stock: ing.minStock,
    last_purchase_price: ing.lastPurchasePrice,
    image_url: ing.imageUrl || null,
    updated_at: new Date().toISOString(),
  };
  if (isUuid) {
    payload.id = ing.id;
  }
  return payload;
}

function mapDbMenuItemToFrontend(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: (row.categories?.name || row.category || 'Seblak') as any,
    basePrice: Number(row.base_price ?? 0),
    description: row.description || '',
    isAvailable: row.is_available ?? true,
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
    menuItemId: it.menu_item_id,
    menuItemName: it.menu_items?.name || 'Item Seblak',
    quantity: Number(it.quantity ?? 1),
    price: Number(it.base_price ?? 0),
    levelPedas: Number(it.spicy_level ?? 0),
    toppings: (it.transaction_item_toppings || []).map((tp: any) => ({
      id: tp.topping_id,
      name: tp.topping_options?.name || 'Topping',
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

    if (error) throw error;
    if (data && data.length > 0) {
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

    if (error) throw error;
    if (data && data.length > 0) {
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
    if (error) throw error;
    if (data) {
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

export async function fetchTransactionsFromSupabase(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return getTransactions();
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, menu_items(name), transaction_item_toppings(*, topping_options(name)))')
      .order('created_at', { ascending: false })
      .limit(300);

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
      const settings: StoreSettings = {
        storeName: data.store_name,
        slogan: data.slogan,
        address: data.address,
        phone: data.phone,
        textScale: data.text_scale || 'normal',
        isDarkMode: Boolean(data.is_dark_mode),
        userName: 'Owner Waroeng',
        userRole: 'Administrator',
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

// ============================================================================
// SYNCHRONOUS & HYBRID FUNCTIONS (Untuk UI Component Rendering & Local Cache)
// ============================================================================

export function getIngredients(): Ingredient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
    if (!raw) {
      const initial = [...INITIAL_INGREDIENTS];
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca data bahan:', e);
    return INITIAL_INGREDIENTS;
  }
}

export function saveIngredient(ingredient: Ingredient): void {
  const current = getIngredients();
  const index = current.findIndex((i) => i.id === ingredient.id);
  const status = calculateStockStatus(ingredient.currentStock, ingredient.minStock);
  const updatedItem: Ingredient = {
    ...ingredient,
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

  // Sync ke Supabase di background
  if (isSupabaseConfigured()) {
    const dbPayload = mapFrontendIngredientToDb(updatedItem);
    supabase
      .from('ingredients')
      .upsert(dbPayload)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal menyimpan bahan:', error);
      });
  }
}

export function deleteIngredient(id: string): void {
  const current = getIngredients();
  const filtered = current.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(filtered));

  if (isSupabaseConfigured()) {
    supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal menghapus bahan:', error);
      });
  }
}

export function adjustStock(
  ingredientId: string,
  amountChange: number,
  type: 'masuk' | 'keluar',
  note: string
): { success: boolean; newStock: number; message?: string } {
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
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  // Sync ke Supabase di background
  if (isSupabaseConfigured()) {
    // 1. Update stok bahan
    supabase
      .from('ingredients')
      .update({ current_stock: newStock, updated_at: nowIso })
      .eq('id', ing.id)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal update stok bahan:', error);
      });

    // 2. Tambah record stock_logs
    supabase
      .from('stock_logs')
      .insert({
        ingredient_id: ing.id,
        type,
        amount: amountChange,
        balance_after: newStock,
        note: newLog.note,
      })
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal mencatat stock log:', error);
      });
  }

  return { success: true, newStock };
}

export function getStockLogs(ingredientId?: string): StockLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    let logs: StockLog[] = raw ? JSON.parse(raw) : INITIAL_STOCK_LOGS;
    if (ingredientId) {
      logs = logs.filter((l) => l.ingredientId === ingredientId);
    }
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error('Gagal membaca log stok:', e);
    return INITIAL_STOCK_LOGS;
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
    if (!raw) {
      const initial = [...INITIAL_MENU_ITEMS];
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca data menu:', e);
    return INITIAL_MENU_ITEMS;
  }
}

export function saveMenuItem(menuItem: MenuItem): void {
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

  if (isSupabaseConfigured()) {
    const isUuid = menuItem.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(menuItem.id);
    const payload: any = {
      name: menuItem.name,
      category: menuItem.category,
      base_price: menuItem.basePrice,
      description: menuItem.description,
      is_available: menuItem.isAvailable,
    };
    if (isUuid) {
      payload.id = menuItem.id;
    }
    supabase
      .from('menu_items')
      .upsert(payload)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal menyimpan menu item:', error);
      });
  }
}

export function deleteMenuItem(id: string): void {
  const current = getMenuItems();
  const filtered = current.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filtered));

  if (isSupabaseConfigured()) {
    supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal menghapus menu item:', error);
      });
  }
}

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca transaksi:', e);
    return INITIAL_TRANSACTIONS;
  }
}

export function createTransaction(
  txData: Omit<Transaction, 'id' | 'invoiceNumber' | 'date' | 'status'>
): Transaction {
  const currentTransactions = getTransactions();
  const nextNumber = currentTransactions.length + 1001;
  const newInvoice = `TR-48-${nextNumber}`;
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

  // Kirim transaksi ke Supabase
  if (isSupabaseConfigured()) {
    supabase
      .from('transactions')
      .insert({
        invoice_number: newInvoice,
        customer_name: newTransaction.customerName,
        total_amount: newTransaction.totalAmount,
        payment_method: newTransaction.paymentMethod,
        cash_received: newTransaction.cashReceived,
        change_amount: newTransaction.change ?? 0,
        status: newTransaction.status,
        notes: newTransaction.notes,
      })
      .select('id')
      .single()
      .then(async ({ data: txRow, error }) => {
        if (error) {
          console.error('⚠️ [Supabase] Gagal menyimpan transaksi:', error);
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
                quantity: item.quantity,
                base_price: item.price,
                spicy_level: item.levelPedas,
                subtotal: item.subtotal,
                item_notes: item.notes,
              })
              .select('id')
              .single();

            if (!itemErr && itemRow && item.toppings && item.toppings.length > 0) {
              const toppingInserts = item.toppings.map((top) => {
                const isTopUuid = top.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(top.id);
                return {
                  transaction_item_id: itemRow.id,
                  topping_id: isTopUuid ? top.id : null,
                  price: top.price,
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
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca pengaturan:', e);
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: StoreSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

  if (isSupabaseConfigured()) {
    supabase
      .from('store_settings')
      .upsert({
        id: 1,
        store_name: settings.storeName,
        slogan: settings.slogan,
        address: settings.address,
        phone: settings.phone,
        text_scale: settings.textScale,
        is_dark_mode: settings.isDarkMode,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal update store settings:', error);
      });
  }
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
}
