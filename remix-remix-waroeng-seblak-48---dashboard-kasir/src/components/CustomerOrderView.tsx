import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
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
  ChevronsDown,
  Search,
  X,
} from 'lucide-react';
import { Ingredient, MenuItem, StoreSettings, OrderItem, BowlOrderDrink } from '../types';
import { formatRupiah } from '../utils/formatters';
import { IngredientImage } from './IngredientIllustration';
import { createTransaction, addBowlOrder } from '../services/storage';

interface CustomerOrderViewProps {
  settings: StoreSettings;
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  onToggleTheme: () => void;
  onBackToLogin: () => void;
  onOpenCashier?: () => void;
  onOrderCreated: () => void;
}

type OrderStep =
  | 'bowl_number'
  | 'customer_identity'
  | 'order_details'
  | 'ask_drink'
  | 'select_drink'
  | 'confirmation'
  | 'completed';

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

// Icon cabai berjejer dari kiri ke kanan dengan ukuran semakin besar sesuai level (Original, 1, 2, 3, 4, 5, dan Request)
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

// Komponen SVG Cabai (Chili Pepper) dengan ukuran dinamis
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
      {/* Tangkai Cabai */}
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
      {/* Badan Cabai Melengkung */}
      <path
        d="M24.5 11.5C26.5 15 25 22 19.5 27.5C14 33 6.5 33.5 4.5 31.5C3 30 5.5 28 8.5 26C12.5 23.5 15.5 18.5 17.5 11C18.5 8 22.5 8.5 24.5 11.5Z"
        fill={bodyColor}
      />
      {/* Kilau Cabai */}
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

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  settings,
  onToggleTheme,
  onBackToLogin,
  onOpenCashier,
  onOrderCreated,
}) => {
  // Flow Step State
  const [step, setStep] = useState<OrderStep>('bowl_number');

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
  const [isEditingReceipt, setIsEditingReceipt] = useState<boolean>(false);
  const [createdInvoice, setCreatedInvoice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Scroll hint state for Step 2 when user is still at the top / hasn't scrolled to submit
  const [showScrollHint, setShowScrollHint] = useState<boolean>(false);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (step !== 'order_details') {
      setShowScrollHint(false);
      return;
    }

    const checkScrollPosition = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // Tampilkan petunjuk scroll jika halaman bisa di-scroll dan user masih di bagian atas,
      // atau jika nama pemesan belum diisi saat masih di bagian atas
      const isAtBottom = scrollY + viewportHeight >= fullHeight - 90;
      if (!isAtBottom && (fullHeight > viewportHeight + 40 || scrollY < 80)) {
        setShowScrollHint(true);
      } else {
        setShowScrollHint(false);
      }
    };

    checkScrollPosition();
    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);
    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [step, customerName]);

  const handleScrollDownClick = () => {
    if (submitButtonRef.current) {
      submitButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollBy({ top: 320, behavior: 'smooth' });
    }
  };

  // Drink helpers
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

  const totalDrinkCount = Object.values(selectedDrinks).reduce((sum, qty) => sum + qty, 0);
  const totalDrinkPrice = DRINK_CATALOG.reduce(
    (sum, drink) => sum + (selectedDrinks[drink.id] || 0) * drink.price,
    0
  );

  // Step 1 Submit (Nomor Mangkuk -> Fase 2: Identitas Nama)
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bowlNumber.trim()) {
      setErrorMsg('Silakan masukkan atau pilih nomor mangkuk Anda terlebih dahulu.');
      return;
    }
    setErrorMsg('');
    setStep('customer_identity');
  };

  // Step 2 Submit (Identitas Nama -> Fase 3: Racikan Seblak)
  const handleIdentityNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Silakan masukkan nama pemesan agar mudah dipanggil.');
      return;
    }
    setErrorMsg('');
    setStep('order_details');
  };

  // Step 3 Submit (Racikan Seblak -> Fase 4: Pertanyaan Minuman)
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStep('ask_drink');
  };

  // Step 3 Decision
  const handleAskDrinkChoice = (choice: boolean) => {
    setWantsDrink(choice);
    if (choice) {
      setStep('select_drink');
    } else {
      setSelectedDrinks({});
      setStep('confirmation');
    }
  };

  // Final Confirmation Submit
  const handleConfirmOrder = () => {
    const spicySummaryLabel =
      spicyLevel === 0
        ? 'Original'
        : spicyLevel === 6
        ? `Request (${spicyRequestText.trim() || 'Sesuai Request'})`
        : `${spicyLevel}`;

    const items: OrderItem[] = [
      {
        menuItemId: 'menu-1',
        menuItemName: `Seblak Prasmanan (Mangkuk #${bowlNumber.trim()})`,
        quantity: 1,
        price: 15000,
        levelPedas: spicyLevel === 6 ? 5 : spicyLevel,
        toppings: [],
        subtotal: 15000,
        notes: `${dineType} · Kuah ${brothType} · Pedas: ${spicySummaryLabel}${notes.trim() ? ` · ${notes.trim()}` : ''}`,
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

    const totalAmount = items.reduce((acc, item) => acc + item.subtotal, 0);

    const newTx = createTransaction({
      customerName: `${customerName.trim()} (Mangkuk #${bowlNumber.trim()})`,
      items,
      totalAmount,
      paymentMethod: 'QRIS',
      notes: `${dineType} | Mangkuk #${bowlNumber.trim()} | Kuah: ${brothType} | Pedas: ${spicySummaryLabel}${
        notes.trim() ? ` | Catatan: ${notes.trim()}` : ''
      }`,
    });

    const orderedDrinks: BowlOrderDrink[] = [];
    DRINK_CATALOG.forEach((drink) => {
      const qty = selectedDrinks[drink.id] || 0;
      if (qty > 0) {
        orderedDrinks.push({
          id: drink.id,
          name: drink.name,
          price: drink.price,
          qty,
        });
      }
    });

    addBowlOrder({
      bowlNumber: bowlNumber.trim(),
      customerName: customerName.trim(),
      dineType,
      spicyLevel,
      spicyRequestText: spicyLevel === 6 ? spicyRequestText.trim() : undefined,
      brothType,
      notes: notes.trim(),
      drinks: orderedDrinks,
      invoiceNumber: newTx.invoiceNumber,
    });

    setCreatedInvoice(newTx.invoiceNumber);
    onOrderCreated();
    setStep('completed');
  };

  // Reset for new order
  const handleResetOrder = () => {
    setBowlNumber('');
    setCustomerName('');
    setDineType('Makan di Sini');
    setSpicyLevel(2);
    setSpicyRequestText('');
    setBrothType('Asin Manis');
    setNotes('');
    setWantsDrink(false);
    setSelectedDrinks({});
    setDrinkSearchQuery('');
    setCreatedInvoice('');
    setErrorMsg('');
    setStep('bowl_number');
  };

  const filteredDrinks = DRINK_CATALOG.filter(
    (d) =>
      d.name.toLowerCase().includes(drinkSearchQuery.trim().toLowerCase()) ||
      d.description.toLowerCase().includes(drinkSearchQuery.trim().toLowerCase())
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
      {/* Top Header Bar - Hanya Informasi Nama Toko */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 truncate">
                {settings.storeName}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {settings.slogan || 'Layanan Mandiri Pemesanan Pelanggan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenCashier && (
              <button
                type="button"
                onClick={onOpenCashier}
                className="py-2 px-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/70 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Catat Kasir</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToLogin}
              className="py-2 px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Halaman Login</span>
              <span className="sm:hidden">Login</span>
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-10 pb-24 flex flex-col">
        {/* Error Alert if any */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 text-center">
            {errorMsg}
          </div>
        )}

        {/* Animated Step Views */}
        <AnimatePresence mode="wait">
          {/* ==================== STEP 1: NOMOR MANGKUK ==================== */}
          {step === 'bowl_number' && (
            <motion.div
              key="step-bowl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
                {/* Centered Bowl Visual Indicator */}
                <div className="w-24 h-24 rounded-3xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 flex flex-col items-center justify-center mx-auto shadow-xs">
                  <Soup className="w-9 h-9 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-black text-orange-800 dark:text-orange-300 tabular-nums mt-1">
                    {bowlNumber ? `#${bowlNumber}` : 'No. ?'}
                  </span>
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                    01. Identitas Mangkuk Prasmanan
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Masukkan Nomor Mangkuk Anda
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Lihat stiker nomor yang tertera pada mangkuk seblak yang Anda ambil di meja prasmanan.
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

                {/* Quick Pick Grid */}
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
                    <span>Lanjut Isi Identitas Pemesan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ==================== STEP 2: IDENTITAS PEMESAN (HANYA ISI NAMA) ==================== */}
          {step === 'customer_identity' && (
            <motion.div
              key="step-identity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Tombol Ubah Mangkuk di Luar Card Sebelah Kiri Atas */}
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
                      02. Identitas Pemesan · Mangkuk #{bowlNumber}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                      Siapa Nama Anda?
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                      Masukkan nama panggilan Anda agar kasir dan koki mudah memanggil saat seblak selesai dimasak.
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

          {/* ==================== STEP 3: RACIKAN SEBLAK (PENYAJIAN, PEDAS, KUAH) ==================== */}
          {step === 'order_details' && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Tombol Kembali ke Identitas di Luar Card Sebelah Kiri Atas */}
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

              {/* Card Utama Fase Ketiga (Racikan) */}
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6">
                {/* Judul dan Keterangan Rata Tengah */}
                <div className="text-center space-y-1.5 pb-5 border-b border-stone-100 dark:border-stone-800 max-w-md mx-auto">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block">
                    03. Racikan Seblak · Mangkuk #{bowlNumber} ({customerName})
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Atur Penyajian, Kuah &amp; Kepedasan
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Pilih cara penyajian, tingkat pedas cabai, dan karakter kuah seblak sesuai selera Anda.
                  </p>
                </div>

                <form onSubmit={handleStep2Next} className="space-y-6">

                  {/* 3. Opsi Penyajian: Cukup Tulisan Judulnya Saja Tanpa Keterangan, Bersampingan Kanan Kiri */}
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

                  {/* 4. Level Kepedasan: Icon Cabai Berjejer Kiri ke Kanan (1, 2, 3, 4, 5, dan Request) */}
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
                              title={`${item.label} - ${item.name}`}
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

                  {/* 5. Karakter Kuah: Opsi Dropdown Supaya Ringkas */}
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

                  {/* Catatan Tambahan (Opsional) */}
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
                      ref={submitButtonRef}
                      type="submit"
                      className="w-full py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjutkan Pemesanan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 3A: PERTANYAAN TAMBAH MINUMAN ==================== */}
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
                  03. Tambahan Minuman Segar
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                  Ingin Tambah Minuman?
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  Seblak hangat ({selectedSpicyDisplay}) paling pas ditemani minuman dingin yang menyegarkan. Apakah Anda ingin memilih minuman?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => handleAskDrinkChoice(true)}
                  className="p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left flex flex-col justify-between shadow-lg shadow-emerald-600/20 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg font-black">Ya, Tambah Minuman</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-emerald-100">
                    Buka daftar pilihan Es Teh Manis, Es Jeruk Peras, atau Air Mineral.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleAskDrinkChoice(false)}
                  className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-left flex flex-col justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base sm:text-lg font-black">Tidak, Lanjut Konfirmasi</span>
                    <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Langsung menuju halaman pemeriksaan akhir rincian pesanan Anda.
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

          {/* ==================== STEP 3B: PILIHAN MINUMAN ==================== */}
          {step === 'select_drink' && (
            <motion.div
              key="step-select-drink"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Tombol Kembali di Luar Card Sebelah Kiri Atas */}
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
                {/* Header Katalog Minuman Rata Tengah */}
                <div className="text-center space-y-1 pb-4 border-b border-stone-100 dark:border-stone-800 max-w-md mx-auto">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    04. Katalog Minuman Segar
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Pilih Minuman Pendamping
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Pilih minuman dingin segar untuk menemani seblak hangat Anda.
                  </p>
                </div>

                {/* Kolom Pencarian Minuman */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={drinkSearchQuery}
                    onChange={(e) => setDrinkSearchQuery(e.target.value)}
                    placeholder="Cari nama minuman (contoh: Es Teh, Jeruk, Air Mineral)..."
                    className="w-full text-xs sm:text-sm font-semibold py-3 pl-11 pr-10 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                  {drinkSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDrinkSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Grid 2 Kolom Berjejer ke Samping */}
                {filteredDrinks.length > 0 ? (
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
                ) : (
                  <div className="py-8 px-4 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800">
                    <p className="text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300">
                      Minuman &ldquo;{drinkSearchQuery}&rdquo; tidak ditemukan.
                    </p>
                  </div>
                )}

                {/* Footer Ringkasan & Tombol Konfirmasi di Dalam Card (Rapi & Tidak Keluar Card) */}
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
                        setStep('confirmation');
                      }}
                      className="w-full py-3 px-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer text-center"
                    >
                      Lanjut Tanpa Minuman
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('confirmation')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Lanjut ke Konfirmasi</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 4: KONFIRMASI ULANG SEMUA DATA (TAMPILAN STRUK BELANJA) ==================== */}
          {step === 'confirmation' && (
            <motion.div
              key="step-confirmation"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Tombol Kembali di Luar Struk Sebelah Kiri Atas */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingReceipt(false);
                    setStep(wantsDrink ? 'select_drink' : 'ask_drink');
                  }}
                  className="py-2 px-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
                  <span>Kembali</span>
                </button>
              </div>

              {/* Kertas Struk Belanja Utuh (Tidak Dipisah-pisah Card) */}
              <div className="max-w-lg mx-auto bg-[#FFFDF9] dark:bg-stone-900 rounded-2xl border border-stone-300/90 dark:border-stone-700 shadow-lg overflow-hidden relative">
                {/* Aksen Gerigi Kertas Struk Atas */}
                <div className="h-2.5 w-full bg-orange-600" />

                {/* Tombol Edit Tunggal di Pojok Kanan Atas Struk */}
                <div className="px-5 sm:px-7 pt-5 flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500">
                    STRUK KONFIRMASI PESANAN
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingReceipt((prev) => !prev)}
                    title={isEditingReceipt ? 'Selesai Edit Struk' : 'Edit Data Struk'}
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
                  {/* Header Toko pada Struk */}
                  <div className="text-center pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700 space-y-1">
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-stone-900 dark:text-stone-100 font-sans">
                      {settings.storeName || 'WAROENG SEBLAK 48'}
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                      {settings.address || 'Seblak Prasmanan Pedas Nikmat'}
                    </p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 pt-0.5">
                      {new Date().toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date().toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {isEditingReceipt && (
                    <div className="py-2 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/70 text-[11px] font-sans font-semibold text-orange-700 dark:text-orange-300 text-center">
                      Mode Edit Aktif: Ubah langsung kolom pada struk di bawah ini.
                    </div>
                  )}

                  {/* Bagian 1: Identitas & Penyajian (Disatukan dalam Baris Struk) */}
                  <div className="space-y-2.5 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                    {/* Baris Nomor Mangkuk */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">NO. MANGKUK</span>
                      {isEditingReceipt ? (
                        <input
                          type="text"
                          value={bowlNumber}
                          onChange={(e) => setBowlNumber(e.target.value)}
                          placeholder="No. Mangkuk"
                          className="w-36 sm:w-44 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-sans"
                        />
                      ) : (
                        <span className="font-black text-orange-600 dark:text-orange-400 text-right">
                          #{bowlNumber}
                        </span>
                      )}
                    </div>

                    {/* Baris Nama Pemesan */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">NAMA PEMESAN</span>
                      {isEditingReceipt ? (
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nama Anda"
                          className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-sans"
                        />
                      ) : (
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-right truncate max-w-[200px]">
                          {customerName}
                        </span>
                      )}
                    </div>

                    {/* Baris Penyajian */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">PENYAJIAN</span>
                      {isEditingReceipt ? (
                        <select
                          value={dineType}
                          onChange={(e) => setDineType(e.target.value as DineType)}
                          className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans cursor-pointer"
                        >
                          <option value="Makan di Sini">Makan di Sini</option>
                          <option value="Dibungkus">Dibungkus</option>
                        </select>
                      ) : (
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-right">
                          {dineType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bagian 2: Detail Racikan Seblak */}
                  <div className="space-y-2.5 pb-4 border-b-2 border-dashed border-stone-300 dark:border-stone-700">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      ITEM RACIKAN SEBLAK
                    </div>

                    {/* Baris Karakter Kuah */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">JENIS KUAH</span>
                      {isEditingReceipt ? (
                        <select
                          value={brothType}
                          onChange={(e) => setBrothType(e.target.value as BrothType)}
                          className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans cursor-pointer"
                        >
                          {BROTH_TYPES.map((b) => (
                            <option key={b.id} value={b.id}>
                              Kuah {b.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-right">
                          Kuah {brothType}
                        </span>
                      )}
                    </div>

                    {/* Baris Level Kepedasan */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">KEPEDASAN</span>
                      {isEditingReceipt ? (
                        <select
                          value={spicyLevel}
                          onChange={(e) => setSpicyLevel(Number(e.target.value))}
                          className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans cursor-pointer"
                        >
                          {SPICY_LEVELS.map((sp) => (
                            <option key={sp.level} value={sp.level}>
                              {sp.level === 0
                                ? 'Original (Tidak Pedas)'
                                : sp.level === 6
                                ? 'Request Pedas'
                                : `Level ${sp.label} - ${sp.name}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-red-600 dark:text-red-400 text-right">
                          {selectedSpicyDisplay}
                        </span>
                      )}
                    </div>

                    {/* Kolom Takaran Request Pedas jika memilih Request saat Edit */}
                    {isEditingReceipt && spicyLevel === 6 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-500 dark:text-stone-400 shrink-0">TAKARAN PEDAS</span>
                        <input
                          type="text"
                          value={spicyRequestText}
                          onChange={(e) => setSpicyRequestText(e.target.value)}
                          placeholder="Misal: 7 sendok cabai"
                          className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans"
                        />
                      </div>
                    )}

                    {/* Baris Catatan Tambahan */}
                    {(notes.trim() || isEditingReceipt) && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-500 dark:text-stone-400 shrink-0">CATATAN</span>
                        {isEditingReceipt ? (
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Catatan dapur (opsional)"
                            className="w-44 sm:w-52 text-right font-bold py-1.5 px-2.5 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans"
                          />
                        ) : (
                          <span className="font-semibold text-stone-700 dark:text-stone-300 text-right">
                            &ldquo;{notes}&rdquo;
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bagian 3: Daftar Minuman pada Struk */}
                  <div className="space-y-2.5 pb-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      MINUMAN TAMBAHAN
                    </div>

                    {isEditingReceipt ? (
                      <div className="space-y-2 pt-1">
                        {DRINK_CATALOG.map((drink) => {
                          const qty = selectedDrinks[drink.id] || 0;
                          return (
                            <div
                              key={drink.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="text-stone-700 dark:text-stone-300 truncate">
                                {drink.name}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={qty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setSelectedDrinks((prev) => {
                                    const next = { ...prev };
                                    if (val <= 0) {
                                      delete next[drink.id];
                                    } else {
                                      next[drink.id] = val;
                                    }
                                    return next;
                                  });
                                }}
                                className="w-16 text-center font-bold py-1 px-2 rounded-lg border border-orange-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none font-sans"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : totalDrinkCount > 0 ? (
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
                                  {drink.name}
                                </span>
                                <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                                  x{qty}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-stone-400 dark:text-stone-500">
                        <span>Tidak ada minuman</span>
                        <span>-</span>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-sans font-bold text-red-600 dark:text-red-300 text-center">
                      {errorMsg}
                    </div>
                  )}

                  {/* Tombol Konfirmasi di Dalam Bawah Struk */}
                  <div className="pt-4 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        if (!bowlNumber.trim()) {
                          setErrorMsg('Nomor mangkuk tidak boleh kosong.');
                          return;
                        }
                        if (!customerName.trim()) {
                          setErrorMsg('Nama pemesan tidak boleh kosong.');
                          return;
                        }
                        setErrorMsg('');
                        setIsEditingReceipt(false);
                        handleConfirmOrder();
                      }}
                      className="w-full py-4 px-5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Konfirmasi &amp; Selesaikan Pemesanan</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 5: PEMESANAN SELESAI DENGAN ANIMASI ==================== */}
          {step === 'completed' && (
            <motion.div
              key="step-completed"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl p-6 sm:p-10 text-center space-y-6 relative overflow-hidden"
            >
              {/* Animated Celebration Icon Cluster */}
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

                {/* Animated Sparkle Accents */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -6 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="absolute -top-1 -right-1 text-amber-500"
                >
                  <Sparkles className="w-6 h-6 fill-amber-400" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="space-y-2"
              >
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Pesanan Diterima Dapur · {createdInvoice}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-stone-100">
                  Pemesanan Selesai!
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                  Terima kasih <strong className="text-stone-800 dark:text-stone-200">{customerName}</strong>! Mangkuk seblak Anda sedang diracik oleh koki kami sesuai pilihan kuah dan level pedas.
                </p>
              </motion.div>

              {/* Ticket Summary Box */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
                className="max-w-md mx-auto p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-left space-y-3"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
                  <div>
                    <span className="text-[11px] font-bold text-stone-400 block">NOMOR MANGKUK</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                      #{bowlNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-stone-400 block">PENYAJIAN</span>
                    <span className="text-sm font-extrabold text-stone-800 dark:text-stone-200">
                      {dineType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Nama Pemesan:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Racikan Kuah:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      Kuah {brothType} · Pedas{' '}
                      {spicyLevel === 0
                        ? 'Original'
                        : spicyLevel === 6
                        ? `Request${spicyRequestText.trim() ? ` (${spicyRequestText.trim()})` : ''}`
                        : spicyLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Minuman:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-right">
                      {totalDrinkCount > 0
                        ? DRINK_CATALOG.filter((d) => (selectedDrinks[d.id] || 0) > 0)
                            .map((d) => `${d.name} x${selectedDrinks[d.id]}`)
                            .join(', ')
                        : 'Tanpa Minuman'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="flex items-center justify-center pt-2"
              >
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Pesan Mangkuk Baru</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 7. Efek Petunjuk Scroll ke Bawah Saat User Masih di Bagian Atas / Belum Selesai Mengisi */}
        <AnimatePresence>
          {step === 'order_details' && showScrollHint && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
            >
              <motion.button
                type="button"
                onClick={handleScrollDownClick}
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-auto py-2.5 px-5 rounded-2xl bg-stone-900/95 dark:bg-orange-600/95 text-white backdrop-blur-md shadow-xl border border-white/15 flex items-center gap-2 text-xs font-extrabold cursor-pointer"
              >
                <span>Scroll ke bawah untuk lengkapi &amp; lanjut</span>
                <ChevronsDown className="w-4 h-4 text-orange-400 dark:text-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
