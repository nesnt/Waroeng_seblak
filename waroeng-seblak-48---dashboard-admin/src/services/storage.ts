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
  TOPPING_OPTIONS,
  generateInitialTransactions,
} from '../data/dummyData';

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

/**
 * ============================================================================
 * [LAPISAN DATA / STORAGE LAYER]
 * Saat aplikasi diintegrasikan dengan backend (misal Node.js/Express, Firebase,
 * atau PostgreSQL), fungsi-fungsi di bawah ini cukup diganti dengan fetch / axios
 * ke endpoint REST API backend tanpa perlu mengubah komponen UI.
 * ============================================================================
 */

// ==================== BAHAN & STOK ====================

// [BACKEND REPLACEABLE]: Ganti dengan GET /api/ingredients
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

// [BACKEND REPLACEABLE]: Ganti dengan POST/PUT /api/ingredients/:id
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

// [BACKEND REPLACEABLE]: Ganti dengan DELETE /api/ingredients/:id
export function deleteIngredient(id: string): void {
  const current = getIngredients();
  const filtered = current.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(filtered));
}

// [BACKEND REPLACEABLE]: Ganti dengan POST /api/ingredients/:id/stock-adjustment
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

  // Catat ke Log Perubahan Stok
  addStockLog({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ingredientId: ing.id,
    ingredientName: ing.name,
    date: new Date().toISOString(),
    type,
    amount: amountChange,
    unit: ing.unit,
    note: note || (type === 'masuk' ? 'Penambahan stok manual' : 'Pengurangan stok manual'),
    balanceAfter: newStock,
  });

  return { success: true, newStock };
}

// ==================== LOG PERUBAHAN STOK ====================

// [BACKEND REPLACEABLE]: Ganti dengan GET /api/stock-logs
export function getStockLogs(ingredientId?: string): StockLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    let logs: StockLog[] = raw ? JSON.parse(raw) : INITIAL_STOCK_LOGS;
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
    }
    if (ingredientId) {
      logs = logs.filter((l) => l.ingredientId === ingredientId);
    }
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error('Gagal membaca log stok:', e);
    return INITIAL_STOCK_LOGS;
  }
}

// [BACKEND REPLACEABLE]: Ganti dengan POST /api/stock-logs
export function addStockLog(log: StockLog): void {
  const current = getStockLogs();
  const updated = [log, ...current];
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(updated));
}

// ==================== MENU & RESEP ====================

// [BACKEND REPLACEABLE]: Ganti dengan GET /api/menu
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

// [BACKEND REPLACEABLE]: Ganti dengan POST/PUT /api/menu/:id
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

// [BACKEND REPLACEABLE]: Ganti dengan DELETE /api/menu/:id
export function deleteMenuItem(id: string): void {
  const current = getMenuItems();
  const filtered = current.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filtered));
}

// ==================== TRANSAKSI & PENJUALAN ====================

// [BACKEND REPLACEABLE]: Ganti dengan GET /api/transactions
export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      const initial = generateInitialTransactions();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca transaksi:', e);
    return [];
  }
}

/**
 * Menyimpan transaksi baru sekaligus memotong stok bahan secara otomatis
 * berdasarkan resep per menu dan topping tambahan yang dipilih.
 *
 * [BACKEND REPLACEABLE]: Pada arsitektur backend, operasi ini berupa
 * transaksi database ACID (PostgreSQL / Firestore transaction) di endpoint
 * POST /api/transactions.
 */
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

  // Simpan transaksi
  const updatedTransactions = [newTransaction, ...currentTransactions];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

  // --- PEMOTONGAN STOK OTOMATIS BERDASARKAN RESEP ---
  const currentIngredients = getIngredients();
  const menuMap = new Map(getMenuItems().map((m) => [m.id, m]));
  const toppingMap = new Map(TOPPING_OPTIONS.map((t) => [t.id, t]));

  // Hitung total bahan yang dipakai dalam transaksi ini
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
        usageMap[recipeItem.ingredientId].reason.push(
          `${menu.name} x${item.quantity}`
        );
      });
    }

    // Jika ada topping tambahan yang punya bahan terkait
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

  // Potong stok dan catat riwayat log stok bahan
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

      // Catat log
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

  return newTransaction;
}

// ==================== PENGATURAN TOKO ====================

// [BACKEND REPLACEABLE]: Ganti dengan GET /api/settings
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

// [BACKEND REPLACEABLE]: Ganti dengan PUT /api/settings
export function saveSettings(settings: StoreSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// Muat ulang data dummy (reset ke data awal untuk demo)
export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(INITIAL_INGREDIENTS));
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(generateInitialTransactions()));
  localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
}
