export type IngredientCategory =
  | 'Kerupuk'
  | 'Topping & Baso'
  | 'Frozen Food'
  | 'Keringan'
  | 'Daging'
  | 'Sayuran & Telur'
  | 'Bumbu & Kuah'
  | 'Mie & Pasta'
  | 'Minuman'
  | 'Special'
  | (string & {});

export type StockStatus = 'aman' | 'menipis' | 'habis';

export type StockChangeType = 'masuk' | 'keluar';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  currentStock: number;
  unit: string;
  minStock: number;
  lastPurchasePrice: number;
  status: StockStatus;
  updatedAt: string;
  imageUrl?: string;
}

export interface StockLog {
  id: string;
  ingredientId: string;
  ingredientName: string;
  date: string;
  type: StockChangeType;
  amount: number;
  unit: string;
  note: string;
  balanceAfter: number;
}

export interface RecipeItem {
  ingredientId: string;
  amount: number;
  unit: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Seblak' | 'Paket Seblak' | 'Minuman' | 'Ekstra' | (string & {});
  basePrice: number;
  description: string;
  isAvailable: boolean;
  recipe: RecipeItem[];
  imageUrl?: string;
  stock?: number;
  unit?: string;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
  ingredientId?: string;
  amountUsed?: number;
}

export interface SelectedTopping {
  id: string;
  ingredientId?: string;
  name: string;
  price: number;
}

export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
  levelPedas: number;
  toppings: SelectedTopping[];
  subtotal: number;
  notes?: string;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  status: 'Selesai' | 'Batal';
  notes?: string;
}

export type TextScale = 'normal' | 'large' | 'xlarge';

export type UserAccountStatus = 'Online' | 'Sibuk' | 'Istirahat';

export interface StoreSettings {
  storeName: string;
  slogan: string;
  address: string;
  phone: string;
  textScale: TextScale;
  isDarkMode: boolean;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userStatus?: UserAccountStatus;
}

export interface BowlOrderDrink {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface BowlOrder {
  id: string;
  bowlNumber: string;
  customerName: string;
  dineType: 'Makan di Sini' | 'Dibungkus';
  spicyLevel: number;
  spicyRequestText?: string;
  brothType: 'Asin Manis' | 'Gurih' | 'Manis';
  notes?: string;
  drinks: BowlOrderDrink[];
  createdAt: string;
  status: 'menunggu_hitung' | 'selesai';
  invoiceNumber?: string;
}
