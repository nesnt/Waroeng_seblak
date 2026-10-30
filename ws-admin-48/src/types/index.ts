export type IngredientCategory =
  | 'Kerupuk'
  | 'Frozen Food'
  | 'Keringan'
  | 'Daging'
  | 'Minuman'
  | 'Special';

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
  category: 'Seblak' | 'Minuman' | 'Ekstra';
  basePrice: number;
  description: string;
  isAvailable: boolean;
  recipe: RecipeItem[];
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
export type UserRole = 'ADMIN' | 'KASIR';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  status?: UserAccountStatus;
  createdAt: string;
}

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
