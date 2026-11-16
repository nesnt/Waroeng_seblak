/**
 * Definisi Type Database Supabase PostgreSQL untuk Waroeng Seblak 48
 * Sesuai dengan skema database pada planning/schema.sql
 */

export interface DbUser {
  id: string; // UUID
  username: string;
  password_hash: string;
  full_name: string;
  role: 'KASIR' | 'ADMIN';
  account_status: 'Online' | 'Sibuk' | 'Istirahat';
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string; // UUID
  name: string;
  type: 'ingredient' | 'menu';
  description?: string | null;
}

export interface DbIngredient {
  id: string; // UUID
  name: string;
  category_id?: string | null;
  category_name?: string; // Dari join categories.name
  current_stock: number;
  unit: string;
  min_stock: number;
  last_purchase_price: number;
  status: 'aman' | 'menipis' | 'habis';
  image_url?: string | null;
  updated_at: string;
}

export interface DbToppingOption {
  id: string; // UUID
  name: string;
  price: number;
  ingredient_id: string;
  amount_used: number;
}

export interface DbMenuItem {
  id: string; // UUID
  name: string;
  category_id?: string | null;
  category_name?: string;
  base_price: number;
  description?: string | null;
  is_available: boolean;
  created_at: string;
}

export interface DbMenuRecipe {
  id: string; // UUID
  menu_item_id: string;
  ingredient_id: string;
  amount_needed: number;
  unit: string;
}

export interface DbTransaction {
  id: string; // UUID
  invoice_number: string;
  cashier_id?: string | null;
  customer_name?: string | null;
  dine_type: 'Makan di Sini' | 'Dibungkus';
  total_amount: number;
  payment_method: 'Tunai' | 'QRIS' | 'Transfer';
  cash_received?: number | null;
  change_amount?: number | null;
  status: 'Selesai' | 'Batal';
  notes?: string | null;
  created_at: string;
}

export interface DbTransactionItem {
  id: string; // UUID
  transaction_id: string;
  menu_item_id: string;
  quantity: number;
  base_price: number;
  spicy_level: number;
  broth_type?: string | null;
  subtotal: number;
  item_notes?: string | null;
}

export interface DbTransactionItemTopping {
  id: string; // UUID
  transaction_item_id: string;
  topping_id: string;
  price: number;
  quantity: number;
}

export interface DbBowlOrder {
  id: string; // UUID
  bowl_number: string;
  customer_name: string;
  dine_type: 'Makan di Sini' | 'Dibungkus';
  spicy_level: number;
  spicy_request_text?: string | null;
  broth_type: 'Asin Manis' | 'Gurih' | 'Manis';
  notes?: string | null;
  status: 'menunggu_hitung' | 'selesai' | 'batal';
  transaction_id?: string | null;
  invoice_number?: string | null;
  created_at: string;
}

export interface DbBowlOrderTopping {
  id: string; // UUID
  bowl_order_id: string;
  topping_id: string;
  qty: number;
}

export interface DbBowlOrderDrink {
  id: string; // UUID
  bowl_order_id: string;
  menu_item_id?: string | null;
  name?: string | null;
  price?: number | null;
  qty: number;
}

export interface DbStockLog {
  id: string; // UUID
  ingredient_id: string;
  transaction_id?: string | null;
  type: 'masuk' | 'keluar';
  amount: number;
  balance_after: number;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface DbStoreSettings {
  id: number; // INT PRIMARY KEY 1
  store_name: string;
  slogan: string;
  address: string;
  phone: string;
  text_scale: 'normal' | 'large' | 'xlarge';
  is_dark_mode: boolean;
  updated_at: string;
}
