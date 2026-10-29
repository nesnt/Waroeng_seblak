import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Utensils,
  ShoppingBag,
  CupSoda,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  User,
  Hash,
  Soup,
  Plus,
  Minus,
  ClipboardCheck,
  RotateCcw,
  Sun,
  Moon,
  Edit3,
  ChevronDown,
  Search,
  X,
  ShoppingCart,
  Trash2,
  ListChecks,
  FileEdit,
  LogOut,
} from 'lucide-react';
import {
  Ingredient,
  IngredientCategory,
  MenuItem,
  StoreSettings,
  OrderItem,
  BowlOrder,
  SelectedTopping,
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { IngredientImage } from './IngredientIllustration';
import {
  createTransaction,
  getBowlOrders,
  completeBowlOrder,
  fetchBowlOrdersFromSupabase,
  subscribeToBowlOrders,
} from '../services/storage';
import { TOPPING_OPTIONS } from '../data/dummyData';

interface CashierRecordViewProps {
  settings: StoreSettings;
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  onToggleTheme: () => void;
  onBackToLogin: () => void;
  onOpenCustomerOrder: () => void;
  onOrderCreated: () => void;
}

type CashierStep =
  | 'select_mode'
  | 'auto_bowl_list'
  | 'bowl_number'
  | 'customer_identity'
  | 'order_details'
  | 'ask_drink'
  | 'select_drink'
  | 'count_toppings'
  | 'confirmation'
  | 'completed';

type RecordMode = 'manual' | 'auto';
type DineType = 'Makan di Sini' | 'Dibungkus';
type BrothType = 'Asin Manis' | 'Gurih' | 'Manis';

interface DrinkOption {
  id: string;
  name: string;
  price: number;
  description: string;
  ingredientId?: string;
}

const DRINK_CATALOG: DrinkOption[] = [
  {
    id: 'drink-esteh',
    name: 'Es Teh Manis Cup',
    price: 5000,
    description: 'Es teh manis melati segar ukuran cup besar penawar pedas',
    ingredientId: 'ing-20',
  },
  {
    id: 'drink-esjeruk',
    name: 'Es Jeruk Peras Cup',
    price: 6000,
    description: 'Perasan jeruk asli segar dengan es batu kristal',
    ingredientId: 'ing-21',
  },
  {
    id: 'drink-airmineral',
    name: 'Air Mineral Botol',
    price: 4000,
    description: 'Air mineral botol dingin 600ml',
    ingredientId: 'ing-22',
  },
  {
    id: 'drink-estehtawar',
    name: 'Es Teh Tawar Cup',
    price: 3000,
    description: 'Es teh melati dingin tanpa gula segar alami',
    ingredientId: 'ing-20',
  },
];

const SPICY_LEVELS = [
  { level: 0, label: 'Original', name: 'Original (Tidak Pedas)', desc: 'Kuah rempah kencur asli tanpa cabai sama sekali', iconSize: 16 },
  { level: 1, label: '1', name: 'Pedas Manja', desc: '1 sendok cabai, hangat ringan', iconSize: 20 },
  { level: 2, label: '2', name: 'Pedas Sedang', desc: 'Pedas nikmat pas di lidah', iconSize: 24 },
  { level: 3, label: '3', name: 'Pedas Mantap', desc: 'Standar pedas khas Seblak 48', iconSize: 29 },
  { level: 4, label: '4', name: 'Pedas Nampol', desc: 'Pedas kuat bikin berkeringat', iconSize: 34 },
  { level: 5, label: '5', name: 'Pedas Jeletot', desc: 'Ekstra cabai rawit nampol', iconSize: 40 },
  { level: 6, label: 'Request', name: 'Request Pedas', desc: 'Atur sendiri takaran cabai sesuai selera Anda', iconSize: 45 },
];

const BROTH_TYPES: { id: BrothType; title: BrothType; desc: string; tag: string }[] = [
  {
    id: 'Asin Manis',
    title: 'Asin Manis',
    desc: 'Perpaduan seimbang gurih kaldu kencur dengan sentuhan manis khas Sunda.',
    tag: 'Paling Favorit',
  },
  {
    id: 'Gurih',
    title: 'Gurih',
    desc: 'Kuah kaldu asin gurih kencur & bawang putih yang kuat tanpa rasa manis.',
    tag: 'Klasik Original',
  },
  {
    id: 'Manis',
    title: 'Manis',
    desc: 'Dominan rasa manis legit berpadu bumbu rempah kencur yang hangat.',
    tag: 'Lembut & Legit',
  },
];

const QUICK_BOWL_NUMBERS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
  '15', '18', '20', '24', '28', '48',
];

const TOPPING_CATEGORIES: ('Semua' | IngredientCategory)[] = [
  'Semua',
  'Kerupuk',
  'Frozen Food',
  'Keringan',
  'Daging',
  'Special',
];

const ChiliPepperIcon: React.FC<{ size: number; active: boolean; isZero?: boolean }> = ({
  size,
  active,
  isZero = false,
}) => {
  const bodyColor = isZero
    ? active
      ? '#10b981'
      : '#a8a29e'
    : active
    ? '#dc2626'
    : '#d6d3d1';
  const stemColor = active ? '#15803d' : '#78716c';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-transform duration-200"
    >
      <path
        d="M24 6C25.5 4 28.5 3.5 30.5 4.5"
        stroke={stemColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M20.5 8.5C22 6.5 25 6.5 26.5 8.5C27.5 10 26.5 12 24.5 12.5"
        fill={stemColor}
      />
      <path
        d="M24.5 11.5C26.5 15 25 22 19.5 27.5C14 33 6.5 33.5 4.5 31.5C3 30 5.5 28 8.5 26C12.5 23.5 15.5 18.5 17.5 11C18.5 8 22.5 8.5 24.5 11.5Z"
        fill={bodyColor}
      />
      <path
        d="M20.5 13.5C21 17 19 22 14.5 26"
        stroke="#ffffff"
        strokeOpacity={active ? '0.55' : '0.3'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export interface PrasmananToppingItem {
  id: string;
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  price: number;
  stock: number;
  unit: string;
}

export const CashierRecordView: React.FC<CashierRecordViewProps> = ({
  settings,
  ingredients,
  onToggleTheme,
  onBackToLogin,
  onOpenCustomerOrder,
  onOrderCreated,
}) => {
  const [step, setStep] = useState<CashierStep>('select_mode');
  const [recordMode, setRecordMode] = useState<RecordMode>('manual');

  // Daftar antrean mangkuk dari pembeli (untuk Pencatatan Otomatis)
  const [bowlOrders, setBowlOrders] = useState<BowlOrder[]>(() => getBowlOrders());
  const [selectedAutoBowlId, setSelectedAutoBowlId] = useState<string | null>(null);
  const [autoSearchQuery, setAutoSearchQuery] = useState<string>('');

  // Form Data States
  const [bowlNumber, setBowlNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [dineType, setDineType] = useState<DineType>('Makan di Sini');
  const [spicyLevel, setSpicyLevel] = useState<number>(2);
  const [spicyRequestText, setSpicyRequestText] = useState<string>('');
  const [brothType, setBrothType] = useState<BrothType>('Asin Manis');
  const [notes, setNotes] = useState<string>('');
  const [wantsDrink, setWantsDrink] = useState<boolean>(false);
  const [selectedDrinks, setSelectedDrinks] = useState<Record<string, number>>({});
  const [drinkSearchQuery, setDrinkSearchQuery] = useState<string>('');

  // Fase Hitung Topping (Cart Belanja Topping + Modal Cart)
  const [selectedToppings, setSelectedToppings] = useState<Record<string, number>>({});
  const [toppingCategory, setToppingCategory] = useState<'Semua' | IngredientCategory>('Semua');
  const [toppingSearchQuery, setToppingSearchQuery] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);

  // Konfirmasi
  const [isEditingReceipt, setIsEditingReceipt] = useState<boolean>(false);
  const [createdInvoice, setCreatedInvoice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step !== 'count_toppings') {
      setIsCartModalOpen(false);
    }
  }, [step]);

  // Langganan antrean mangkuk realtime dari Supabase
  useEffect(() => {
    fetchBowlOrdersFromSupabase().then(setBowlOrders);
    const unsub = subscribeToBowlOrders(setBowlOrders);
    return () => {
      unsub();
    };
  }, []);

  const refreshBowlOrders = () => {
    setBowlOrders(getBowlOrders());
    fetchBowlOrdersFromSupabase().then(setBowlOrders);
  };

  // Bangun katalog topping dari stok bahan (selain Minuman) + harga jual TOPPING_OPTIONS
  const toppingCatalog: PrasmananToppingItem[] = ingredients
    .filter((ing) => ing.category !== 'Minuman')
    .map((ing) => {
      const matchedOpt = TOPPING_OPTIONS.find(
        (t) =>
          t.ingredientId === ing.id &&
          !t.id.startsWith('top-1') &&
          !t.id.startsWith('top-2') &&
          !t.id.startsWith('top-3') &&
          !t.id.startsWith('top-4') &&
          !t.id.startsWith('top-5') &&
          !t.id.startsWith('top-6') &&
          !t.id.startsWith('top-7') &&
          !t.id.startsWith('top-8') &&
          !t.id.startsWith('top-9')
      );
      const fallbackPrice = Math.max(1000, Math.ceil((ing.lastPurchasePrice * 1.5) / 500) * 500);
      return {
        id: matchedOpt ? matchedOpt.id : `top-${ing.id}`,
        ingredientId: ing.id,
        name: ing.name,
        category: ing.category,
        price: matchedOpt ? matchedOpt.price : fallbackPrice,
        stock: ing.currentStock,
        unit: ing.unit,
      };
    });

  // Update qty minuman
  const updateDrinkQty = (drinkId: string, delta: number) => {
    setSelectedDrinks((prev) => {
      const current = prev[drinkId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[drinkId];
      } else {
        updated[drinkId] = next;
      }
      return updated;
    });
  };

  // Update qty topping (konsep cart belanja)
  const updateToppingQty = (toppingId: string, delta: number) => {
    setSelectedToppings((prev) => {
      const current = prev[toppingId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[toppingId];
      } else {
        updated[toppingId] = next;
      }
      return updated;
    });
    if (errorMsg) setErrorMsg('');
  };

  const clearToppingsCart = () => {
    setSelectedToppings({});
  };

  // Perhitungan total minuman & topping
  const totalDrinkCount = Object.values(selectedDrinks).reduce((sum, qty) => sum + qty, 0);
  const totalDrinkPrice = DRINK_CATALOG.reduce(
    (sum, drink) => sum + (selectedDrinks[drink.id] || 0) * drink.price,
    0
  );

  const totalToppingCount = Object.values(selectedToppings).reduce((sum, qty) => sum + qty, 0);
  const totalToppingPrice = toppingCatalog.reduce(
    (sum, top) => sum + (selectedToppings[top.id] || 0) * top.price,
    0
  );

  const grandTotalPrice = totalToppingPrice + totalDrinkPrice;

  // Pilihan Mode Awal: Manual atau Otomatis
  const handleSelectMode = (mode: RecordMode) => {
    setRecordMode(mode);
    setErrorMsg('');
    if (mode === 'manual') {
      setSelectedAutoBowlId(null);
      setBowlNumber('');
      setCustomerName('');
      setDineType('Makan di Sini');
      setSpicyLevel(2);
      setSpicyRequestText('');
      setBrothType('Asin Manis');
      setNotes('');
      setWantsDrink(false);
      setSelectedDrinks({});
      setSelectedToppings({});
      setStep('bowl_number');
    } else {
      refreshBowlOrders();
      setStep('auto_bowl_list');
    }
  };

  // Klik Nomor Mangkuk pada Pencatatan Otomatis -> Langsung Masuk ke Hitung Topping
  const handleSelectAutoBowl = (order: BowlOrder) => {
    setSelectedAutoBowlId(order.id);
    setBowlNumber(order.bowlNumber);
    setCustomerName(order.customerName);
    setDineType(order.dineType);
    setSpicyLevel(order.spicyLevel);
    setSpicyRequestText(order.spicyRequestText || '');
    setBrothType(order.brothType);
    setNotes(order.notes || '');

    const drinkMap: Record<string, number> = {};
    order.drinks.forEach((d) => {
      if (d.qty > 0) {
        drinkMap[d.id] = d.qty;
      }
    });
    setSelectedDrinks(drinkMap);
    setWantsDrink(order.drinks.length > 0);
    setSelectedToppings({});
    setErrorMsg('');
    setStep('count_toppings');
  };

  // Step Manual 1: Nomor Mangkuk -> Identitas
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bowlNumber.trim()) {
      setErrorMsg('Silakan masukkan atau pilih nomor mangkuk terlebih dahulu.');
      return;
    }
    setErrorMsg('');
    setStep('customer_identity');
  };

  // Step Manual 2: Identitas -> Racikan Seblak
  const handleIdentityNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Silakan masukkan nama pemesan terlebih dahulu.');
      return;
    }
    setErrorMsg('');
    setStep('order_details');
  };

  // Step Manual 3: Racikan Seblak -> Tanya Minuman
  const handleStepDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStep('ask_drink');
  };

  // Step Manual 4: Pilihan Minuman -> Setelah minuman masuk ke fase baru: Hitung Topping
  const handleAskDrinkChoice = (choice: boolean) => {
    setWantsDrink(choice);
    if (choice) {
      setStep('select_drink');
    } else {
      setSelectedDrinks({});
      setStep('count_toppings');
    }
  };

  // Step Hitung Topping -> Lanjut ke Konfirmasi
  const handleProceedToConfirmation = () => {
    if (totalToppingCount === 0) {
      setErrorMsg('Silakan klik minimal 1 card topping yang diambil pembeli di mangkuk.');
      setIsCartModalOpen(false);
      return;
    }
    setErrorMsg('');
    setIsCartModalOpen(false);
    setStep('confirmation');
  };

  // Step Konfirmasi Akhir -> Simpan Transaksi & Potong Stok
  const handleConfirmOrder = () => {
    if (!bowlNumber.trim()) {
      setErrorMsg('Nomor mangkuk tidak boleh kosong.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Nama pemesan tidak boleh kosong.');
      return;
    }
    if (totalToppingCount === 0) {
      setErrorMsg('Belum ada topping yang dipilih.');
      return;
    }

    const spicySummaryLabel =
      spicyLevel === 0
        ? 'Original'
        : spicyLevel === 6
        ? `Request (${spicyRequestText.trim() || 'Sesuai Request'})`
        : `${spicyLevel}`;

    // Susun daftar SelectedTopping untuk pemotongan stok otomatis di storage.ts
    const expandedToppings: SelectedTopping[] = [];
    const toppingSummaryParts: string[] = [];

    toppingCatalog.forEach((top) => {
      const qty = selectedToppings[top.id] || 0;
      if (qty > 0) {
        toppingSummaryParts.push(`${top.name} x${qty}`);
        for (let i = 0; i < qty; i++) {
          expandedToppings.push({
            id: top.id,
            name: top.name,
            price: top.price,
          });
        }
      }
    });

    const items: OrderItem[] = [
      {
        menuItemId: 'menu-prasmanan',
        menuItemName: `Seblak Prasmanan (Mangkuk #${bowlNumber.trim()})`,
        quantity: 1,
        price: totalToppingPrice,
        levelPedas: spicyLevel === 6 ? 5 : spicyLevel,
        toppings: expandedToppings,
        subtotal: totalToppingPrice,
        notes: `${dineType} · Kuah ${brothType} · Pedas: ${spicySummaryLabel} · Topping: ${toppingSummaryParts.join(', ')}${
          notes.trim() ? ` · Catatan: ${notes.trim()}` : ''
        }`,
      },
    ];

    DRINK_CATALOG.forEach((drink) => {
      const qty = selectedDrinks[drink.id] || 0;
      if (qty > 0) {
        items.push({
          menuItemId: 'menu-6',
          menuItemName: drink.name,
          quantity: qty,
          price: drink.price,
          levelPedas: 0,
          toppings: [],
          subtotal: qty * drink.price,
          notes: 'Minuman Tambahan',
        });
      }
    });

    const newTx = createTransaction({
      customerName: `${customerName.trim()} (Mangkuk #${bowlNumber.trim()})`,
      items,
      totalAmount: grandTotalPrice,
      paymentMethod: 'Tunai',
      notes: `[Catat Kasir ${recordMode === 'auto' ? 'Otomatis' : 'Manual'}] ${dineType} | Mangkuk #${bowlNumber.trim()} | Kuah: ${brothType} | Pedas: ${spicySummaryLabel}${
        notes.trim() ? ` | Catatan: ${notes.trim()}` : ''
      }`,
    });

    if (recordMode === 'auto' && selectedAutoBowlId) {
      completeBowlOrder(selectedAutoBowlId, newTx.invoiceNumber);
      refreshBowlOrders();
    }

    setCreatedInvoice(newTx.invoiceNumber);
    onOrderCreated();
    setStep('completed');
  };

  const handleResetToStart = () => {
    setBowlNumber('');
    setCustomerName('');
    setDineType('Makan di Sini');
    setSpicyLevel(2);
    setSpicyRequestText('');
    setBrothType('Asin Manis');
    setNotes('');
    setWantsDrink(false);
    setSelectedDrinks({});
    setSelectedToppings({});
    setDrinkSearchQuery('');
    setToppingSearchQuery('');
    setToppingCategory('Semua');
    setSelectedAutoBowlId(null);
    setIsCartModalOpen(false);
    setCreatedInvoice('');
    setErrorMsg('');
    refreshBowlOrders();
    setStep('select_mode');
  };

  const filteredDrinks = DRINK_CATALOG.filter(
    (d) =>
      d.name.toLowerCase().includes(drinkSearchQuery.trim().toLowerCase()) ||
      d.description.toLowerCase().includes(drinkSearchQuery.trim().toLowerCase())
  );

  const filteredToppings = toppingCatalog.filter((top) => {
    const matchCategory = toppingCategory === 'Semua' || top.category === toppingCategory;
    const matchSearch = top.name
      .toLowerCase()
      .includes(toppingSearchQuery.trim().toLowerCase());
    return matchCategory && matchSearch;
  });

  const pendingBowlOrders = bowlOrders.filter((b) => b.status === 'menunggu_hitung');

  const filteredAutoBowls = pendingBowlOrders.filter((b) =>
    b.bowlNumber.toLowerCase().includes(autoSearchQuery.trim().toLowerCase())
  );

  const selectedSpicyInfo = SPICY_LEVELS.find((s) => s.level === spicyLevel) || SPICY_LEVELS[2];
  const selectedSpicyDisplay =
    spicyLevel === 0
      ? 'Original · Tidak Pedas'
      : spicyLevel === 6
      ? `Request${spicyRequestText.trim() ? ` (${spicyRequestText.trim()})` : ''}`
      : `${spicyLevel} · ${selectedSpicyInfo.name}`;
  const selectedBrothInfo = BROTH_TYPES.find((b) => b.id === brothType) || BROTH_TYPES[0];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
      {/* Top Header Bar / Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 truncate">
                Catat Kasir · {settings.storeName}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                Pencatatan Topping Mangkuk Pembeli
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCustomerOrder}
              className="py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Soup className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Layar Pembeli</span>
            </button>
            <button
              type="button"
              onClick={onBackToLogin}
              className="py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Keluar dari sesi kasir"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              title="Ganti Mode Tampilan"
            >
              {settings.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 pb-28 flex flex-col">
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 text-center">
            {errorMsg}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ==================== STEP 0: PILIH METODE PENCATATAN (2 TOMBOL BERSAMPINGAN DI MOBILE & DESKTOP) ==================== */}
          {step === 'select_mode' && (
            <motion.div
              key="step-select-mode"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-4 sm:p-8 space-y-5 sm:space-y-7"
            >
              <div className="text-center space-y-1.5 max-w-xl mx-auto pb-4 sm:pb-6 border-b border-stone-100 dark:border-stone-800">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-2">
                  <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 block">
                  Mode Kasir · Pencatatan Topping Seblak
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                  Pilih Metode Pencatatan
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Pilih pencatatan manual atau otomatis berdasarkan nomor mangkuk.
                </p>
              </div>

              {/* Grid 2 Kolom Bersampingan (Mobile & Desktop) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Opsi 1: Pencatatan Manual */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('manual')}
                  className="p-3.5 sm:p-6 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-orange-500 dark:hover:border-orange-500 bg-stone-50/70 dark:bg-stone-800/40 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 text-left flex flex-col justify-between gap-3 sm:gap-5 transition group cursor-pointer min-w-0"
                >
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shadow-orange-600/20 shrink-0">
                        <FileEdit className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500">
                        MANUAL
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug">
                        Pencatatan Manual
                      </h3>
                      <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-3">
                        Input dari awal seperti pembeli, lalu hitung topping &amp; konfirmasi.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 sm:pt-3 border-t border-stone-200/80 dark:border-stone-700/70 flex items-center justify-between text-[11px] sm:text-xs font-black text-orange-600 dark:text-orange-400">
                    <span className="truncate">Mulai Manual</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* Opsi 2: Pencatatan Otomatis */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('auto')}
                  className="p-3.5 sm:p-6 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-stone-50/70 dark:bg-stone-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left flex flex-col justify-between gap-3 sm:gap-5 transition group cursor-pointer min-w-0"
                >
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20 shrink-0">
                        <ListChecks className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {pendingBowlOrders.length} Aktif
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                        Pencatatan Otomatis
                      </h3>
                      <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-3">
                        Pilih nomor mangkuk yang sudah pesan, langsung hitung topping.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 sm:pt-3 border-t border-stone-200/80 dark:border-stone-700/70 flex items-center justify-between text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <span className="truncate">Pilih Mangkuk</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP OTOMATIS: PILIH NOMOR MANGKUK (CUKUP TAMPILKAN NOMOR MANGKUK SAJA) ==================== */}
          {step === 'auto_bowl_list' && (
            <motion.div
              key="step-auto-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('select_mode')}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ganti Metode Pencatatan</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-5 sm:p-8 space-y-5">
                <div className="text-center space-y-1 pb-4 border-b border-stone-100 dark:border-stone-800 max-w-md mx-auto">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    Pencatatan Otomatis
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Pilih Nomor Mangkuk
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Klik nomor mangkuk untuk langsung masuk ke hitung topping.
                  </p>
                </div>

                {/* Kolom Pencarian Nomor Mangkuk */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={autoSearchQuery}
                    onChange={(e) => setAutoSearchQuery(e.target.value)}
                    placeholder="Cari nomor mangkuk (contoh: 12)..."
                    className="w-full text-xs sm:text-sm font-semibold py-3 pl-11 pr-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                  {autoSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAutoSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Grid Nomor Mangkuk Saja */}
                {filteredAutoBowls.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filteredAutoBowls.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => handleSelectAutoBowl(order)}
                        className="py-5 px-3 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-stone-50/70 dark:bg-stone-800/50 hover:bg-emerald-600 hover:text-white text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center gap-1 transition group cursor-pointer shadow-2xs"
                      >
                        <Soup className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                        <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">
                          #{order.bowlNumber}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-3">
                    <Soup className="w-10 h-10 text-stone-400 mx-auto" />
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                      Nomor mangkuk tidak ditemukan
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectMode('manual')}
                      className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Pindah ke Pencatatan Manual</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================== MANUAL STEP 1: NOMOR MANGKUK ==================== */}
          {step === 'bowl_number' && (
            <motion.div
              key="step-bowl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => setStep('select_mode')}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>Ganti Metode Pencatatan</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
                  <div className="w-24 h-24 rounded-3xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center mx-auto shadow-xs">
                    <Soup className="w-9 h-9 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-black text-orange-800 dark:text-orange-300 tabular-nums mt-1">
                      {bowlNumber ? `#${bowlNumber}` : 'No. ?'}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                      Pencatatan Manual · 01. Nomor Mangkuk
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                      Masukkan Nomor Mangkuk Pembeli
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                      Ketik atau pilih cepat nomor mangkuk yang dibawa oleh pembeli ke meja kasir.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleStep1Next} className="space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                      Ketik Nomor Mangkuk
                    </label>
                    <div className="relative">
                      <Hash className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={bowlNumber}
                        onChange={(e) => {
                          setBowlNumber(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Contoh: 12 atau A-05"
                        className="w-full text-lg sm:text-xl font-black tabular-nums py-3.5 pl-12 pr-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                        Atau Pilih Cepat Nomor Mangkuk:
                      </span>
                      {bowlNumber && (
                        <button
                          type="button"
                          onClick={() => setBowlNumber('')}
                          className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                        >
                          Reset Pilihan
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {QUICK_BOWL_NUMBERS.map((num) => {
                        const isSelected = bowlNumber === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setBowlNumber(num);
                              if (errorMsg) setErrorMsg('');
                            }}
                            className={`py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm tabular-nums border transition cursor-pointer ${
                              isSelected
                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-orange-400'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjut Isi Nama Pemesan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ==================== MANUAL STEP 2: IDENTITAS PEMESAN ==================== */}
          {step === 'customer_identity' && (
            <motion.div
              key="step-identity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => setStep('bowl_number')}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>Ubah Mangkuk (#{bowlNumber})</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
                  <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center mx-auto shadow-xs">
                    <User className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-black text-orange-800 dark:text-orange-300 tabular-nums mt-0.5">
                      #{bowlNumber}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                      Pencatatan Manual · 02. Nama Pemesan · Mangkuk #{bowlNumber}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                      Masukkan Nama Pembeli
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                      Catat nama pembeli agar mudah dipanggil saat pesanan selesai dimasak.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleIdentityNext} className="space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                      Nama Pemesan
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Contoh: Kak Nabila / Mas Budi"
                        className="w-full text-base sm:text-lg font-bold py-3.5 pl-12 pr-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjut Pilih Racikan Seblak</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ==================== MANUAL STEP 3: RACIKAN SEBLAK ==================== */}
          {step === 'order_details' && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => setStep('customer_identity')}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>Ubah Nama ({customerName || `Mangkuk #${bowlNumber}`})</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-1.5 pb-5 border-b border-stone-100 dark:border-stone-800 max-w-md mx-auto">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                    Pencatatan Manual · 03. Racikan · Mangkuk #{bowlNumber} ({customerName})
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Atur Penyajian, Kuah &amp; Kepedasan
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Pilih cara penyajian, tingkat pedas cabai, dan karakter kuah seblak sesuai permintaan pembeli.
                  </p>
                </div>

                <form onSubmit={handleStepDetailsNext} className="space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                      Pilihan Penyajian
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDineType('Makan di Sini')}
                        className={`py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2.5 transition cursor-pointer ${
                          dineType === 'Makan di Sini'
                            ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-orange-400'
                        }`}
                      >
                        <Utensils className="w-4 h-4 shrink-0" />
                        <span className="font-extrabold text-xs sm:text-sm whitespace-nowrap">
                          Makan di Sini
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDineType('Dibungkus')}
                        className={`py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2.5 transition cursor-pointer ${
                          dineType === 'Dibungkus'
                            ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-orange-400'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 shrink-0" />
                        <span className="font-extrabold text-xs sm:text-sm whitespace-nowrap">
                          Dibungkus
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                        Tingkat Kepedasan
                      </label>
                      <span className="text-xs font-extrabold text-red-600 dark:text-red-400">
                        {selectedSpicyDisplay}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 space-y-3">
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 items-end">
                        {SPICY_LEVELS.map((item) => {
                          const isSelected = spicyLevel === item.level;
                          const isPassed = item.level > 0 && item.level <= spicyLevel;
                          const isOriginalSelected = item.level === 0 && spicyLevel === 0;

                          return (
                            <button
                              key={item.level}
                              type="button"
                              onClick={() => setSpicyLevel(item.level)}
                              className={`py-3 px-0.5 sm:px-1 rounded-2xl border flex flex-col items-center justify-end gap-2 transition cursor-pointer min-h-[88px] sm:min-h-[96px] ${
                                isSelected
                                  ? item.level === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 shadow-xs'
                                    : 'bg-red-50 dark:bg-red-950/50 border-red-600 shadow-xs'
                                  : 'bg-white dark:bg-stone-900/70 border-stone-200/80 dark:border-stone-700/70 hover:border-orange-400'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <ChiliPepperIcon
                                  size={item.iconSize}
                                  active={isPassed || isOriginalSelected}
                                  isZero={item.level === 0}
                                />
                              </div>
                              <span
                                className={`text-[10px] sm:text-xs font-black tabular-nums truncate max-w-full px-0.5 ${
                                  isSelected
                                    ? item.level === 0
                                      ? 'text-emerald-700 dark:text-emerald-300'
                                      : 'text-red-600 dark:text-red-400'
                                    : 'text-stone-500 dark:text-stone-400'
                                }`}
                              >
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {spicyLevel === 6 && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={spicyRequestText}
                            onChange={(e) => setSpicyRequestText(e.target.value)}
                            placeholder="Ketik request pedas (contoh: Tidak pedas / 8 sendok cabai)..."
                            className="w-full text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      )}

                      <div className="text-center text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                        <strong className="text-stone-800 dark:text-stone-200">
                          {selectedSpicyInfo.name}:
                        </strong>{' '}
                        {selectedSpicyInfo.desc}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                      Pilih Jenis Karakter Kuah
                    </label>
                    <div className="relative">
                      <select
                        value={brothType}
                        onChange={(e) => setBrothType(e.target.value as BrothType)}
                        className="w-full appearance-none text-sm sm:text-base font-extrabold py-3.5 pl-4 pr-11 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {BROTH_TYPES.map((broth) => (
                          <option key={broth.id} value={broth.id}>
                            Kuah {broth.title} — ({broth.tag})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-5 h-5 text-stone-500 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        Kuah {selectedBrothInfo.title}:
                      </span>{' '}
                      {selectedBrothInfo.desc}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      Catatan Kuah / Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Kuah nyemek, banyak daun jeruk, tanpa bawang goreng..."
                      className="w-full text-xs sm:text-sm py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjut Pilihan Minuman</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ==================== MANUAL STEP 4A: PERTANYAAN MINUMAN ==================== */}
          {step === 'ask_drink' && (
            <motion.div
              key="step-ask-drink"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-10 text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CupSoda className="w-10 h-10" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Pencatatan Manual · 04. Tambahan Minuman
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                  Pembeli Tambah Minuman?
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  Pilih apakah pembeli memesan minuman dingin, atau langsung lanjut ke fase{' '}
                  <strong className="text-stone-800 dark:text-stone-200">Hitung Topping</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => handleAskDrinkChoice(true)}
                  className="p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left flex flex-col justify-between shadow-lg shadow-emerald-600/20 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg font-black">Ya, Pilih Minuman</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-emerald-100">
                    Buka daftar Es Teh Manis, Es Jeruk Peras, atau Air Mineral sebelum hitung topping.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleAskDrinkChoice(false)}
                  className="p-5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-left flex flex-col justify-between shadow-lg shadow-orange-600/20 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg font-black">Tidak, Hitung Topping</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-orange-100">
                    Tanpa minuman, langsung masuk ke fase Hitung Topping mangkuk pembeli.
                  </p>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('order_details')}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Detail Kuah &amp; Kepedasan</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== MANUAL STEP 4B: PILIH MINUMAN -> LANJUT HITUNG TOPPING ==================== */}
          {step === 'select_drink' && (
            <motion.div
              key="step-select-drink"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => setStep('ask_drink')}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kembali</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-5 sm:p-8 space-y-5 overflow-hidden">
                <div className="text-center space-y-1 pb-4 border-b border-stone-100 dark:border-stone-800 max-w-md mx-auto">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    04. Katalog Minuman · Mangkuk #{bowlNumber}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Pilih Minuman Pembeli
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Setelah memilih minuman, Anda akan masuk ke fase Hitung Topping.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={drinkSearchQuery}
                    onChange={(e) => setDrinkSearchQuery(e.target.value)}
                    placeholder="Cari nama minuman..."
                    className="w-full text-xs sm:text-sm font-semibold py-3 pl-11 pr-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                  {drinkSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDrinkSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {filteredDrinks.map((drink) => {
                    const qty = selectedDrinks[drink.id] || 0;
                    return (
                      <div
                        key={drink.id}
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition min-w-0 ${
                          qty > 0
                            ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                            : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40'
                        }`}
                      >
                        <div>
                          <div className="h-28 sm:h-36 overflow-hidden bg-stone-100 dark:bg-stone-800">
                            <IngredientImage
                              name={drink.name}
                              category="Minuman"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 sm:p-4 space-y-1">
                            <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                              {drink.name}
                            </h3>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRupiah(drink.price)}
                            </p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug line-clamp-2 pt-0.5">
                              {drink.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 sm:p-4 pt-0">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => updateDrinkQty(drink.id, 1)}
                              className="w-full py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Tambah</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-white dark:bg-stone-900 rounded-xl p-1 border border-emerald-500">
                              <button
                                type="button"
                                onClick={() => updateDrinkQty(drink.id, -1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 flex items-center justify-center cursor-pointer shrink-0"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-xs sm:text-sm tabular-nums text-stone-900 dark:text-stone-100 px-1 truncate">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDrinkQty(drink.id, 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="text-stone-600 dark:text-stone-300 font-semibold">
                      {totalDrinkCount > 0 ? `Terpilih ${totalDrinkCount} minuman` : 'Belum ada minuman dipilih'}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {totalDrinkCount > 0 ? `+ ${formatRupiah(totalDrinkPrice)}` : 'Rp 0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDrinks({});
                        setWantsDrink(false);
                        setStep('count_toppings');
                      }}
                      className="w-full py-3 px-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer text-center"
                    >
                      Lanjut Tanpa Minuman
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('count_toppings')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjut Hitung Topping</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== FASE UTAMA: HITUNG TOPPING (DENGAN AKSES MODAL KERANJANG DI NAVBAR) ==================== */}
          {step === 'count_toppings' && (
            <motion.div
              key="step-count-toppings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Baris Navigasi Atas */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (recordMode === 'auto') {
                      setStep('auto_bowl_list');
                    } else {
                      setStep(wantsDrink ? 'select_drink' : 'ask_drink');
                    }
                  }}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>
                    {recordMode === 'auto'
                      ? 'Pilih Mangkuk Lain'
                      : 'Kembali'}
                  </span>
                </button>

                <div className="text-xs font-bold text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 py-2 px-3.5 rounded-xl">
                  Mangkuk <strong className="text-orange-600 dark:text-orange-400">#{bowlNumber}</strong> ·{' '}
                  <strong className="text-stone-900 dark:text-stone-100">{customerName}</strong>
                </div>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-5 sm:p-8 space-y-6">
                {/* Header Hitung Topping */}
                <div className="text-center space-y-1.5 pb-4 border-b border-stone-100 dark:border-stone-800 max-w-lg mx-auto">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                    Hitung Topping · Mangkuk #{bowlNumber}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Pilih Topping Mangkuk Pembeli
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    Klik card topping untuk menambahkan. Klik tombol mengambang{' '}
                    <button
                      type="button"
                      onClick={() => setIsCartModalOpen(true)}
                      className="font-extrabold text-orange-600 dark:text-orange-400 underline cursor-pointer"
                    >
                      Keranjang ({totalToppingCount})
                    </button>{' '}
                    di kanan bawah untuk melihat daftar topping terpilih.
                  </p>
                </div>

                {/* Filter Kategori & Pencarian Topping */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={toppingSearchQuery}
                      onChange={(e) => setToppingSearchQuery(e.target.value)}
                      placeholder="Cari nama topping (contoh: Ceker, Dumpling, Bakso, Kerupuk)..."
                      className="w-full text-xs sm:text-sm font-semibold py-3 pl-11 pr-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                    {toppingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setToppingSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs Kategori Topping */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {TOPPING_CATEGORIES.map((cat) => {
                      const active = toppingCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setToppingCategory(cat)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                            active
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Card Topping */}
                {filteredToppings.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {filteredToppings.map((top) => {
                      const qty = selectedToppings[top.id] || 0;
                      return (
                        <div
                          key={top.id}
                          onClick={() => updateToppingQty(top.id, 1)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateToppingQty(top.id, 1);
                            }
                          }}
                          className={`rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition min-w-0 cursor-pointer select-none relative group ${
                            qty > 0
                              ? 'border-orange-600 bg-orange-50/30 dark:bg-orange-950/20 shadow-sm'
                              : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:border-orange-400'
                          }`}
                        >
                          <div>
                            <div className="h-24 sm:h-28 overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
                              <IngredientImage
                                name={top.name}
                                category={top.category}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              {qty > 0 && (
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-md tabular-nums">
                                  {qty}x
                                </div>
                              )}
                            </div>

                            <div className="p-3 space-y-1">
                              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 block">
                                {top.category} · Stok {top.stock} {top.unit}
                              </span>
                              <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                                {top.name}
                              </h3>
                              <p className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400 tabular-nums">
                                {formatRupiah(top.price)}
                              </p>
                            </div>
                          </div>

                          {/* Kontrol Tombol Cart di Bawah Card */}
                          <div
                            className="p-3 pt-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => updateToppingQty(top.id, 1)}
                                className="w-full py-2 px-2.5 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-orange-600 dark:hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Pilih Topping</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between bg-white dark:bg-stone-900 rounded-xl p-1 border border-orange-500">
                                <button
                                  type="button"
                                  onClick={() => updateToppingQty(top.id, -1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 flex items-center justify-center cursor-pointer shrink-0"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-black text-xs sm:text-sm tabular-nums text-stone-900 dark:text-stone-100 px-1 truncate">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateToppingQty(top.id, 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center cursor-pointer shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800">
                    <p className="text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300">
                      Topping &ldquo;{toppingSearchQuery}&rdquo; tidak ditemukan.
                    </p>
                  </div>
                )}

                {/* Tombol Aksi Bawah */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCartModalOpen(true)}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    <span>Lihat Keranjang ({totalToppingCount} pcs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToConfirmation}
                    className="w-full flex-1 py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Lanjut ke Konfirmasi · {formatRupiah(grandTotalPrice)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP KONFIRMASI AKHIR (TANPA METODE PEMBAYARAN) ==================== */}
          {step === 'confirmation' && (
            <motion.div
              key="step-confirmation"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingReceipt(false);
                    setStep('count_toppings');
                  }}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>Kembali ke Hitung Topping</span>
                </button>
              </div>

              <div className="max-w-lg mx-auto bg-[#FFFDF9] dark:bg-stone-900 rounded-2xl border border-stone-300/90 dark:border-stone-700 shadow-lg overflow-hidden relative">
                <div className="h-2.5 w-full bg-orange-600" />

                <div className="px-5 sm:px-7 pt-5 flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500">
                    STRUK KONFIRMASI CATAT KASIR ({recordMode === 'auto' ? 'OTOMATIS' : 'MANUAL'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingReceipt((prev) => !prev)}
                    className={`p-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      isEditingReceipt
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-orange-500 hover:text-orange-600'
                    }`}
                  >
                    {isEditingReceipt ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesai</span>
                      </>
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="p-5 sm:p-7 pt-3 space-y-4 font-mono text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  {/* Header Toko */}
                  <div className="text-center pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700 space-y-1">
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-stone-900 dark:text-stone-100 font-sans">
                      {settings.storeName || 'WAROENG SEBLAK 48'}
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                      {settings.address || 'Seblak Prasmanan Pedas Nikmat'}
                    </p>
                  </div>

                  {/* Identitas & Penyajian */}
                  <div className="space-y-2 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400">NO. MANGKUK</span>
                      {isEditingReceipt ? (
                        <input
                          type="text"
                          value={bowlNumber}
                          onChange={(e) => setBowlNumber(e.target.value)}
                          className="w-36 text-right font-bold py-1 px-2 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 font-sans"
                        />
                      ) : (
                        <span className="font-black text-orange-600 dark:text-orange-400">
                          #{bowlNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400">NAMA PEMESAN</span>
                      {isEditingReceipt ? (
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-44 text-right font-bold py-1 px-2 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 font-sans"
                        />
                      ) : (
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {customerName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400">PENYAJIAN</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {dineType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400">RACIKAN KUAH</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-right">
                        Kuah {brothType} · {selectedSpicyDisplay}
                      </span>
                    </div>

                    {notes.trim() && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-500 dark:text-stone-400">CATATAN</span>
                        <span className="font-semibold text-stone-700 dark:text-stone-300 text-right">
                          &ldquo;{notes}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rincian Topping yang Dihitung Kasir */}
                  <div className="space-y-2 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      <span>RINCIAN TOPPING ({totalToppingCount} PCS)</span>
                      <span>SUBTOTAL</span>
                    </div>

                    <div className="space-y-1.5">
                      {toppingCatalog
                        .filter((t) => (selectedToppings[t.id] || 0) > 0)
                        .map((top) => {
                          const qty = selectedToppings[top.id];
                          return (
                            <div
                              key={top.id}
                              className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                            >
                              <span className="text-stone-700 dark:text-stone-300 truncate">
                                {top.name} x{qty}
                              </span>
                              <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums shrink-0">
                                {formatRupiah(top.price * qty)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Rincian Minuman */}
                  <div className="space-y-2 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      <span>MINUMAN TAMBAHAN</span>
                      <span>SUBTOTAL</span>
                    </div>

                    {totalDrinkCount > 0 ? (
                      <div className="space-y-1.5">
                        {DRINK_CATALOG.filter((d) => (selectedDrinks[d.id] || 0) > 0).map(
                          (drink) => {
                            const qty = selectedDrinks[drink.id];
                            return (
                              <div
                                key={drink.id}
                                className="flex items-center justify-between text-xs sm:text-sm"
                              >
                                <span className="text-stone-700 dark:text-stone-300">
                                  {drink.name} x{qty}
                                </span>
                                <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                                  {formatRupiah(drink.price * qty)}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-stone-400 dark:text-stone-500">
                        <span>Tidak ada minuman</span>
                        <span>Rp 0</span>
                      </div>
                    )}
                  </div>

                  {/* Total Akhir & Tombol Konfirmasi */}
                  <div className="space-y-3 pt-1 font-sans">
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-orange-800 dark:text-orange-300 block">
                          TOTAL TAGIHAN MANGKUK #{bowlNumber}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {totalToppingCount} Topping + {totalDrinkCount} Minuman
                        </span>
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                        {formatRupiah(grandTotalPrice)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      className="w-full py-4 px-5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Konfirmasi &amp; Selesaikan Pencatatan Kasir</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP SELESAI ==================== */}
          {step === 'completed' && (
            <motion.div
              key="step-completed"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl p-6 sm:p-10 text-center space-y-6 relative overflow-hidden"
            >
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.25, 1], opacity: [0, 0.3, 0.15] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-emerald-500"
                />
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 220 }}
                  className="relative w-20 h-20 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30"
                >
                  <CheckCircle2 className="w-11 h-11" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -6 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="absolute -top-1 -right-1 text-amber-500"
                >
                  <Sparkles className="w-6 h-6 fill-amber-400" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Transaksi Tercatat · {createdInvoice}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-stone-100">
                  Pencatatan Kasir Selesai!
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                  Mangkuk <strong className="text-stone-800 dark:text-stone-200">#{bowlNumber}</strong> atas nama{' '}
                  <strong className="text-stone-800 dark:text-stone-200">{customerName}</strong> telah berhasil dihitung ({totalToppingCount} topping) dan stok otomatis terpotong.
                </p>
              </div>

              <div className="max-w-md mx-auto p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
                  <div>
                    <span className="text-[11px] font-bold text-stone-400 block">NOMOR MANGKUK</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                      #{bowlNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-stone-400 block">TOTAL TAGIHAN</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(grandTotalPrice)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Nama Pemesan:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Jumlah Topping:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {totalToppingCount} pcs ({formatRupiah(totalToppingPrice)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Minuman:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {totalDrinkCount > 0
                        ? `${totalDrinkCount} item (${formatRupiah(totalDrinkPrice)})`
                        : 'Tanpa Minuman'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetToStart}
                  className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Catat Mangkuk Berikutnya</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ==================== TOMBOL KERANJANG MENGAMBANG DI KANAN BAWAH (SAAT HITUNG TOPPING) ==================== */}
      <AnimatePresence>
        {step === 'count_toppings' && (
          <motion.button
            key="floating-cart-btn"
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCartModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-2xl shadow-orange-600/40 border-2 border-white dark:border-stone-800 flex items-center justify-center cursor-pointer"
            title="Buka Keranjang Topping"
          >
            <ShoppingCart className="w-7 h-7" />
            <span className="absolute -top-1.5 -right-1.5 min-w-7 h-7 px-1.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-black text-xs tabular-nums flex items-center justify-center shadow-md border-2 border-white dark:border-stone-900">
              {totalToppingCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ==================== MODAL KERANJANG TOPPING ==================== */}
      <AnimatePresence>
        {isCartModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 truncate">
                      Keranjang Topping · Mangkuk #{bowlNumber}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      Pemesan: {customerName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Daftar Topping */}
              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                {totalToppingCount > 0 ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                        {totalToppingCount} Item Topping Dipilih
                      </span>
                      <button
                        type="button"
                        onClick={clearToppingsCart}
                        className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kosongkan</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {toppingCatalog
                        .filter((t) => (selectedToppings[t.id] || 0) > 0)
                        .map((top) => {
                          const qty = selectedToppings[top.id];
                          return (
                            <div
                              key={top.id}
                              className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/70 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 block truncate">
                                  {top.name}
                                </span>
                                <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                                  {formatRupiah(top.price)} x {qty} ={' '}
                                  <strong className="text-orange-600 dark:text-orange-400">
                                    {formatRupiah(top.price * qty)}
                                  </strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateToppingQty(top.id, -1)}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center font-black text-xs sm:text-sm tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateToppingQty(top.id, 1)}
                                  className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <ShoppingCart className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                      Keranjang Topping Kosong
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Silakan klik card topping pada halaman Hitung Topping untuk menambahkan item.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer: Ringkasan & Lanjut Konfirmasi */}
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3">
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Subtotal Topping ({totalToppingCount} pcs)</span>
                    <span className="font-bold tabular-nums">{formatRupiah(totalToppingPrice)}</span>
                  </div>
                  {totalDrinkCount > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Subtotal Minuman ({totalDrinkCount} item)</span>
                      <span className="font-bold tabular-nums">{formatRupiah(totalDrinkPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span>Total Tagihan</span>
                    <span className="text-orange-600 dark:text-orange-400 tabular-nums">
                      {formatRupiah(grandTotalPrice)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCartModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    Tambah Lagi
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToConfirmation}
                    className="py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition cursor-pointer"
                  >
                    <span>Konfirmasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
