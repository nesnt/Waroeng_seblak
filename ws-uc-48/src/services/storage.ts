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
import {
  DbIngredient,
  DbMenuItem,
  DbTransaction,
  DbBowlOrder,
  DbStoreSettings,
} from '../types/database';

const STORAGE_KEYS = {
  INGREDIENTS: 'seblak48_v2_ingredients',
  MENU_ITEMS: 'seblak48_v2_menu_items',
  TRANSACTIONS: 'seblak48_v3_transactions',
  STOCK_LOGS: 'seblak48_v2_stock_logs',
  SETTINGS: 'seblak48_v2_settings',
  BOWL_ORDERS: 'seblak48_v2_bowl_orders',
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

function mapDbBowlOrderToFrontend(row: any): BowlOrder {
  const drinks = (row.bowl_order_drinks || []).map((d: any) => ({
    id: d.menu_item_id || d.id,
    name: d.menu_items?.name || 'Minuman',
    price: Number(d.menu_items?.base_price ?? 5000),
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
// ASYNC CLOUD API: Interaksi Langsung ke Supabase PostgreSQL
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, menu_items(name), transaction_item_toppings(*, topping_options(name)))')
      .order('created_at', { ascending: false })
      .limit(100);

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
        userName: 'Siti Kasir 48',
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
// REALTIME SUBSCRIPTIONS: Push update instan untuk Kasir
// ============================================================================

/**
 * Kasir mendengarkan pesanan mangkuk baru secara live dari pembeli (WebSockets)
 */
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
}

export function deleteIngredient(id: string): void {
  const current = getIngredients();
  const filtered = current.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(filtered));
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
  ingredients[index] = {
    ...ing,
    currentStock: newStock,
    status,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
  return { success: true, newStock };
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
}

export function deleteMenuItem(id: string): void {
  const current = getMenuItems();
  const filtered = current.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filtered));
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

  // Potong stok bahan lokal
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
          console.error('⚠️ [Supabase] Gagal menyimpan transaksi kasir:', error);
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

export function addBowlOrder(
  orderData: Omit<BowlOrder, 'id' | 'createdAt' | 'status'>
): BowlOrder {
  const current = getBowlOrders();
  const newOrder: BowlOrder = {
    ...orderData,
    id: `bowl-ord-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'menunggu_hitung',
  };

  const filtered = current.filter(
    (b) => !(b.bowlNumber.toLowerCase() === newOrder.bowlNumber.toLowerCase() && b.status === 'menunggu_hitung')
  );
  const updated = [newOrder, ...filtered];
  localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(updated));

  // Simpan ke Supabase di cloud
  if (isSupabaseConfigured()) {
    supabase
      .from('bowl_orders')
      .insert({
        bowl_number: newOrder.bowlNumber,
        customer_name: newOrder.customerName,
        dine_type: newOrder.dineType,
        spicy_level: newOrder.spicyLevel,
        spicy_request_text: newOrder.spicyRequestText || null,
        broth_type: newOrder.brothType,
        notes: newOrder.notes || null,
        status: 'menunggu_hitung',
        invoice_number: newOrder.invoiceNumber || null,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('⚠️ [Supabase] Gagal menyimpan bowl_order:', error);
          return;
        }
        if (data && newOrder.drinks && newOrder.drinks.length > 0) {
          const drinkRows = newOrder.drinks.map((d) => {
            const isMenuUuid = d.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.id);
            return {
              bowl_order_id: data.id,
              menu_item_id: isMenuUuid ? d.id : null,
              name: d.name,
              price: d.price,
              qty: d.qty,
            };
          });
          supabase
            .from('bowl_order_drinks')
            .insert(drinkRows)
            .then(({ error: drinkErr }) => {
              if (drinkErr) console.error('⚠️ [Supabase] Gagal menyimpan bowl drinks:', drinkErr);
            });
        }
      });
  }

  return newOrder;
}

export function completeBowlOrder(id: string, invoiceNumber?: string): void {
  const current = getBowlOrders();
  const updated = current.map((b) =>
    b.id === id ? { ...b, status: 'selesai' as const, invoiceNumber: invoiceNumber || b.invoiceNumber } : b
  );
  localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    supabase
      .from('bowl_orders')
      .update({
        status: 'selesai',
        ...(invoiceNumber ? { invoice_number: invoiceNumber } : {}),
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('⚠️ [Supabase] Gagal update status bowl_orders:', error);
      });
  }
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.BOWL_ORDERS, JSON.stringify(INITIAL_BOWL_ORDERS));
}
