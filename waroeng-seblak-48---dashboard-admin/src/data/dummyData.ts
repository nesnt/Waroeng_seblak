import { Ingredient, MenuItem, Transaction, StoreSettings, StockLog, ToppingOption } from '../types';

export const INITIAL_INGREDIENTS: Ingredient[] = [
  // KATEGORI: KERUPUK
  {
    id: 'ing-1',
    name: 'Kerupuk Bawang Kuning',
    category: 'Kerupuk',
    currentStock: 40,
    unit: 'pcs',
    minStock: 50,
    lastPurchasePrice: 500,
    status: 'menipis',
    updatedAt: '2026-10-18T16:20:00Z',
  },
  {
    id: 'ing-2',
    name: 'Kerupuk Mawar Merah',
    category: 'Kerupuk',
    currentStock: 85,
    unit: 'pcs',
    minStock: 40,
    lastPurchasePrice: 500,
    status: 'aman',
    updatedAt: '2026-10-17T11:00:00Z',
  },
  {
    id: 'ing-3',
    name: 'Kerupuk Rantai / Tangga',
    category: 'Kerupuk',
    currentStock: 70,
    unit: 'pcs',
    minStock: 35,
    lastPurchasePrice: 500,
    status: 'aman',
    updatedAt: '2026-10-16T14:10:00Z',
  },
  {
    id: 'ing-4',
    name: 'Makaroni Spiral',
    category: 'Kerupuk',
    currentStock: 65,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 500,
    status: 'aman',
    updatedAt: '2026-10-16T14:10:00Z',
  },

  // KATEGORI: FROZEN FOOD
  {
    id: 'ing-5',
    name: 'Dumpling Keju Mozzarella',
    category: 'Frozen Food',
    currentStock: 45,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 2500,
    status: 'aman',
    updatedAt: '2026-10-18T13:00:00Z',
  },
  {
    id: 'ing-6',
    name: 'Dumpling Ayam Spesial',
    category: 'Frozen Food',
    currentStock: 12,
    unit: 'pcs',
    minStock: 25,
    lastPurchasePrice: 2000,
    status: 'menipis',
    updatedAt: '2026-10-19T08:00:00Z',
  },
  {
    id: 'ing-7',
    name: 'Sosis Sapi & Ayam',
    category: 'Frozen Food',
    currentStock: 85,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 1500,
    status: 'aman',
    updatedAt: '2026-10-19T07:30:00Z',
  },
  {
    id: 'ing-8',
    name: 'Chikuwa Mini',
    category: 'Frozen Food',
    currentStock: 55,
    unit: 'pcs',
    minStock: 25,
    lastPurchasePrice: 1500,
    status: 'aman',
    updatedAt: '2026-10-17T10:00:00Z',
  },
  {
    id: 'ing-9',
    name: 'Odeng Korea Tusuk',
    category: 'Frozen Food',
    currentStock: 0,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 2000,
    status: 'habis',
    updatedAt: '2026-10-19T10:00:00Z',
  },
  {
    id: 'ing-10',
    name: 'Crab Stick',
    category: 'Frozen Food',
    currentStock: 48,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 1500,
    status: 'aman',
    updatedAt: '2026-10-18T11:00:00Z',
  },

  // KATEGORI: KERINGAN
  {
    id: 'ing-11',
    name: 'Siomay Kering Mini',
    category: 'Keringan',
    currentStock: 90,
    unit: 'pcs',
    minStock: 40,
    lastPurchasePrice: 500,
    status: 'aman',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'ing-12',
    name: 'Batagor Kering Krispi',
    category: 'Keringan',
    currentStock: 80,
    unit: 'pcs',
    minStock: 40,
    lastPurchasePrice: 1000,
    status: 'aman',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'ing-13',
    name: 'Cuanki Lidah Gurih',
    category: 'Keringan',
    currentStock: 60,
    unit: 'pcs',
    minStock: 25,
    lastPurchasePrice: 1000,
    status: 'aman',
    updatedAt: '2026-10-17T09:00:00Z',
  },
  {
    id: 'ing-14',
    name: 'Cuanki Tahu Bandung',
    category: 'Keringan',
    currentStock: 18,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 1000,
    status: 'menipis',
    updatedAt: '2026-10-19T08:30:00Z',
  },
  {
    id: 'ing-15',
    name: 'Pilus Cikur Bungkus',
    category: 'Keringan',
    currentStock: 50,
    unit: 'pcs',
    minStock: 25,
    lastPurchasePrice: 1000,
    status: 'aman',
    updatedAt: '2026-10-16T09:00:00Z',
  },

  // KATEGORI: DAGING
  {
    id: 'ing-16',
    name: 'Bakso Sapi Segar',
    category: 'Daging',
    currentStock: 120,
    unit: 'pcs',
    minStock: 40,
    lastPurchasePrice: 1200,
    status: 'aman',
    updatedAt: '2026-10-19T07:30:00Z',
  },
  {
    id: 'ing-17',
    name: 'Ceker Ayam Ungkep',
    category: 'Daging',
    currentStock: 15,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 1500,
    status: 'menipis',
    updatedAt: '2026-10-19T08:00:00Z',
  },
  {
    id: 'ing-18',
    name: 'Tulang Rangu / Balungan',
    category: 'Daging',
    currentStock: 35,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 2500,
    status: 'aman',
    updatedAt: '2026-10-18T07:00:00Z',
  },
  {
    id: 'ing-19',
    name: 'Sayap Ayam Mercon',
    category: 'Daging',
    currentStock: 28,
    unit: 'pcs',
    minStock: 15,
    lastPurchasePrice: 3500,
    status: 'aman',
    updatedAt: '2026-10-17T14:00:00Z',
  },

  // KATEGORI: MINUMAN
  {
    id: 'ing-20',
    name: 'Es Teh Manis Cup',
    category: 'Minuman',
    currentStock: 60,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 3000,
    status: 'aman',
    updatedAt: '2026-10-19T06:30:00Z',
  },
  {
    id: 'ing-21',
    name: 'Es Jeruk Peras Cup',
    category: 'Minuman',
    currentStock: 35,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 4000,
    status: 'aman',
    updatedAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'ing-22',
    name: 'Air Mineral Botol',
    category: 'Minuman',
    currentStock: 10,
    unit: 'pcs',
    minStock: 24,
    lastPurchasePrice: 3000,
    status: 'menipis',
    updatedAt: '2026-10-19T11:00:00Z',
  },

  // KATEGORI: SPECIAL
  {
    id: 'ing-23',
    name: 'Telur Ayam Negeri',
    category: 'Special',
    currentStock: 12,
    unit: 'pcs',
    minStock: 30,
    lastPurchasePrice: 2000,
    status: 'menipis',
    updatedAt: '2026-10-19T09:15:00Z',
  },
  {
    id: 'ing-24',
    name: 'Mie Kuning Telur',
    category: 'Special',
    currentStock: 45,
    unit: 'pcs',
    minStock: 20,
    lastPurchasePrice: 2500,
    status: 'aman',
    updatedAt: '2026-10-16T11:00:00Z',
  },
  {
    id: 'ing-25',
    name: 'Kwetiau Porsi',
    category: 'Special',
    currentStock: 35,
    unit: 'pcs',
    minStock: 15,
    lastPurchasePrice: 2500,
    status: 'aman',
    updatedAt: '2026-10-18T08:00:00Z',
  },
  {
    id: 'ing-26',
    name: 'Jamur Enoki Fresh',
    category: 'Special',
    currentStock: 0,
    unit: 'pcs',
    minStock: 15,
    lastPurchasePrice: 4000,
    status: 'habis',
    updatedAt: '2026-10-19T09:45:00Z',
  },
];

export const TOPPING_OPTIONS: ToppingOption[] = [
  { id: 'top-1', name: 'Telur Ayam (1 pcs)', price: 4000, ingredientId: 'ing-23', amountUsed: 1 },
  { id: 'top-2', name: 'Bakso Sapi (2 pcs)', price: 4000, ingredientId: 'ing-16', amountUsed: 2 },
  { id: 'top-3', name: 'Sosis Ayam (2 pcs)', price: 4000, ingredientId: 'ing-7', amountUsed: 2 },
  { id: 'top-4', name: 'Ceker Ayam (2 pcs)', price: 6000, ingredientId: 'ing-17', amountUsed: 2 },
  { id: 'top-5', name: 'Dumpling Keju (2 pcs)', price: 6000, ingredientId: 'ing-5', amountUsed: 2 },
  { id: 'top-6', name: 'Cuanki Lidah (2 pcs)', price: 3000, ingredientId: 'ing-13', amountUsed: 2 },
  { id: 'top-7', name: 'Siomay Kering (3 pcs)', price: 3000, ingredientId: 'ing-11', amountUsed: 3 },
  { id: 'top-8', name: 'Batagor Kering (2 pcs)', price: 3000, ingredientId: 'ing-12', amountUsed: 2 },
  { id: 'top-9', name: 'Kwetiau Tambahan (1 pcs)', price: 3000, ingredientId: 'ing-25', amountUsed: 1 },
  { id: 'top-10', name: 'Mie Kuning Tambahan (1 pcs)', price: 3000, ingredientId: 'ing-24', amountUsed: 1 },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Seblak Original 48',
    category: 'Seblak',
    basePrice: 15000,
    description: 'Seblak gurih khas aroma kencur dengan kerupuk pilihan, makaroni, telur, dan siomay kering.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-1', amount: 3, unit: 'pcs' },
      { ingredientId: 'ing-4', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-23', amount: 1, unit: 'pcs' },
      { ingredientId: 'ing-11', amount: 2, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-2',
    name: 'Seblak Ceker Mercon',
    category: 'Seblak',
    basePrice: 22000,
    description: 'Seblak ceker empuk bumbu pedas mercon meresap, kerupuk kenyal, telur, dan kuah kencur mantap.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-17', amount: 3, unit: 'pcs' },
      { ingredientId: 'ing-1', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-23', amount: 1, unit: 'pcs' },
      { ingredientId: 'ing-13', amount: 2, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-3',
    name: 'Seblak Bakso Sosis',
    category: 'Seblak',
    basePrice: 20000,
    description: 'Menu favorit anak muda! Perpaduan bakso sapi kenyal, irisan sosis lezat, kerupuk, dan telur.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-16', amount: 3, unit: 'pcs' },
      { ingredientId: 'ing-7', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-1', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-23', amount: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-4',
    name: 'Seblak Komplit Spesial 48',
    category: 'Seblak',
    basePrice: 28000,
    description: 'Paling puas dan terlengkap! Ceker empuk, bakso, sosis, cuanki lidah, siomay, batagor, telur, dan aneka kerupuk.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-17', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-16', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-7', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-13', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-11', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-12', amount: 1, unit: 'pcs' },
      { ingredientId: 'ing-1', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-23', amount: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-5',
    name: 'Seblak Kuah Jeletot Seafood',
    category: 'Seblak',
    basePrice: 25000,
    description: 'Sensasi kuah merah menyala dengan dumpling keju leleh, chikuwa, crab stick, kwetiau kenyal, dan telur.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-5', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-8', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-10', amount: 2, unit: 'pcs' },
      { ingredientId: 'ing-25', amount: 1, unit: 'pcs' },
      { ingredientId: 'ing-23', amount: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-6',
    name: 'Es Teh Manis Jumbo',
    category: 'Minuman',
    basePrice: 5000,
    description: 'Pereda pedas seblak paling segar! Es teh manis dingin melati ukuran jumbo 500ml.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-20', amount: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'menu-7',
    name: 'Pilus Cikur Tambahan',
    category: 'Ekstra',
    basePrice: 3000,
    description: 'Pelengkap kriuk renyah pilus cikur khas Bandung.',
    isAvailable: true,
    recipe: [
      { ingredientId: 'ing-15', amount: 1, unit: 'pcs' },
    ],
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Waroeng Seblak 48',
  slogan: 'Seblak Prasmanan & Racik Asli Bandung Mantap Pedasnya',
  address: 'Jl. Raya Kebon Jeruk No. 48, Jakarta Barat',
  phone: '0812-3456-7890',
  textScale: 'normal',
  isDarkMode: false,
  userName: 'Nabil Rachman',
  userRole: 'Pemilik Warung (Owner)',
  userEmail: 'owner@seblak48.id',
  userStatus: 'Online',
};

export const INITIAL_STOCK_LOGS: StockLog[] = [
  {
    id: 'log-1',
    ingredientId: 'ing-9',
    ingredientName: 'Odeng Korea Tusuk',
    date: '2026-10-19T10:00:00Z',
    type: 'keluar',
    amount: 15,
    unit: 'pcs',
    note: 'Terjual habis pada pesanan pagi',
    balanceAfter: 0,
  },
  {
    id: 'log-2',
    ingredientId: 'ing-23',
    ingredientName: 'Telur Ayam Negeri',
    date: '2026-10-19T09:15:00Z',
    type: 'keluar',
    amount: 18,
    unit: 'pcs',
    note: 'Pemakaian resep & 2 pcs retak saat bongkar muat',
    balanceAfter: 12,
  },
  {
    id: 'log-3',
    ingredientId: 'ing-17',
    ingredientName: 'Ceker Ayam Ungkep',
    date: '2026-10-19T08:30:00Z',
    type: 'keluar',
    amount: 20,
    unit: 'pcs',
    note: 'Pemakaian menu Seblak Ceker Mercon',
    balanceAfter: 15,
  },
  {
    id: 'log-4',
    ingredientId: 'ing-6',
    ingredientName: 'Dumpling Ayam Spesial',
    date: '2026-10-19T08:00:00Z',
    type: 'keluar',
    amount: 13,
    unit: 'pcs',
    note: 'Pemakaian prasmanan frozen food',
    balanceAfter: 12,
  },
  {
    id: 'log-5',
    ingredientId: 'ing-16',
    ingredientName: 'Bakso Sapi Segar',
    date: '2026-10-19T07:30:00Z',
    type: 'masuk',
    amount: 100,
    unit: 'pcs',
    note: 'Kulakan pagi dari Pasar Pagi',
    balanceAfter: 120,
  },
];

// Helper to generate 62 realistic transactions across the past 30 days up to today (October 19, 2026)
export function generateInitialTransactions(): Transaction[] {
  const customerNames = [
    'Mbak Rina', 'Mas Budi', 'Kak Salsa', 'Pak Joko', 'Nabila', 'Rizky', 'Bu Sri',
    'Dimas', 'Putri Ayu', 'Bayu Pratama', 'Kak Dewi', 'Fajar', 'Siti Rahma',
    'Andi Wijaya', 'Ibu Maya', 'Doni', 'Asep Saepul', 'Tia Amelia', 'Agus Susanto',
    'Rangga', 'Mega Lestari', 'Dian Sastro', 'Ilham', 'Indah Permata', 'Hendra'
  ];

  const paymentMethods: ('Tunai' | 'QRIS' | 'Transfer')[] = [
    'Tunai', 'QRIS', 'QRIS', 'Tunai', 'Transfer', 'QRIS', 'Tunai'
  ];

  const transactions: Transaction[] = [];
  const baseDate = new Date('2026-10-19T14:30:00');

  let invoiceCounter = 1001;

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const txCountForDay = daysAgo === 0 ? 6 : (daysAgo % 4 === 0 ? 3 : (daysAgo % 2 === 0 ? 2 : 1));

    for (let t = 0; t < txCountForDay; t++) {
      const txDate = new Date(baseDate);
      txDate.setDate(baseDate.getDate() - daysAgo);

      const isEvening = t % 2 === 1;
      const hour = isEvening ? 18 + (t % 3) : 12 + (t % 2);
      const minute = (t * 19 + daysAgo * 7) % 60;
      txDate.setHours(hour, minute, 0, 0);

      const custIndex = (daysAgo * 3 + t) % customerNames.length;
      const custName = customerNames[custIndex];
      const payMethod = paymentMethods[(daysAgo * 2 + t) % paymentMethods.length];

      const menuPick = (daysAgo + t) % 5;
      let orderItems = [];

      if (menuPick === 0) {
        orderItems.push({
          menuItemId: 'menu-1',
          menuItemName: 'Seblak Original 48',
          quantity: 1,
          price: 15000,
          levelPedas: 2,
          toppings: [{ id: 'top-1', name: 'Telur Ayam (1 pcs)', price: 4000 }],
          subtotal: 19000,
          notes: 'Kuah sedang pedas',
        });
        if (t % 2 === 0) {
          orderItems.push({
            menuItemId: 'menu-6',
            menuItemName: 'Es Teh Manis Jumbo',
            quantity: 1,
            price: 5000,
            levelPedas: 0,
            toppings: [],
            subtotal: 5000,
          });
        }
      } else if (menuPick === 1) {
        orderItems.push({
          menuItemId: 'menu-2',
          menuItemName: 'Seblak Ceker Mercon',
          quantity: 1,
          price: 22000,
          levelPedas: 3,
          toppings: [{ id: 'top-6', name: 'Cuanki Lidah (2 pcs)', price: 3000 }],
          subtotal: 25000,
          notes: 'Ceker minta yang empuk',
        });
        orderItems.push({
          menuItemId: 'menu-6',
          menuItemName: 'Es Teh Manis Jumbo',
          quantity: 1,
          price: 5000,
          levelPedas: 0,
          toppings: [],
          subtotal: 5000,
        });
      } else if (menuPick === 2) {
        orderItems.push({
          menuItemId: 'menu-3',
          menuItemName: 'Seblak Bakso Sosis',
          quantity: 1,
          price: 20000,
          levelPedas: 1,
          toppings: [
            { id: 'top-2', name: 'Bakso Sapi (2 pcs)', price: 4000 },
            { id: 'top-7', name: 'Siomay Kering (3 pcs)', price: 3000 },
          ],
          subtotal: 27000,
        });
      } else if (menuPick === 3) {
        orderItems.push({
          menuItemId: 'menu-4',
          menuItemName: 'Seblak Komplit Spesial 48',
          quantity: 1,
          price: 28000,
          levelPedas: 4,
          toppings: [{ id: 'top-5', name: 'Dumpling Keju (2 pcs)', price: 6000 }],
          subtotal: 34000,
          notes: 'Level 4 kuah banyak cabai',
        });
        orderItems.push({
          menuItemId: 'menu-6',
          menuItemName: 'Es Teh Manis Jumbo',
          quantity: 2,
          price: 5000,
          levelPedas: 0,
          toppings: [],
          subtotal: 10000,
        });
      } else {
        orderItems.push({
          menuItemId: 'menu-5',
          menuItemName: 'Seblak Kuah Jeletot Seafood',
          quantity: 1,
          price: 25000,
          levelPedas: 5,
          toppings: [{ id: 'top-9', name: 'Kwetiau Tambahan (1 pcs)', price: 3000 }],
          subtotal: 28000,
        });
        orderItems.push({
          menuItemId: 'menu-6',
          menuItemName: 'Es Teh Manis Jumbo',
          quantity: 1,
          price: 5000,
          levelPedas: 0,
          toppings: [],
          subtotal: 5000,
        });
      }

      const totalAmount = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
      let cashReceived = undefined;
      let change = undefined;

      if (payMethod === 'Tunai') {
        const roundedUp = Math.ceil(totalAmount / 10000) * 10000;
        cashReceived = roundedUp > totalAmount ? roundedUp : totalAmount + 10000;
        change = cashReceived - totalAmount;
      }

      transactions.push({
        id: `tx-${invoiceCounter}`,
        invoiceNumber: `TR-48-${invoiceCounter}`,
        date: txDate.toISOString(),
        customerName: custName,
        items: orderItems,
        totalAmount,
        paymentMethod: payMethod,
        cashReceived,
        change,
        status: 'Selesai',
        notes: t % 3 === 0 ? 'Makan di tempat' : 'Bungkus / Takeaway',
      });

      invoiceCounter++;
    }
  }

  // Tambahkan data riwayat transaksi dari tahun 2020 s/d 2025 agar filter tahun 2020 - hari ini dapat diuji
  const historicalYears = [2020, 2021, 2022, 2023, 2024, 2025];
  historicalYears.forEach((yr, yIdx) => {
    for (let m = 0; m < 3; m++) {
      const histDate = new Date(yr, (m * 4 + yIdx) % 12, 10 + m * 5, 13 + m, 15 + m * 10, 0);
      const custName = customerNames[(yIdx * 3 + m) % customerNames.length];
      const payMethod = paymentMethods[(yIdx + m) % paymentMethods.length];

      transactions.push({
        id: `tx-hist-${yr}-${m}`,
        invoiceNumber: `TR-48-${yr}-${101 + m}`,
        date: histDate.toISOString(),
        customerName: custName,
        items: [
          {
            menuItemId: 'menu-4',
            menuItemName: 'Seblak Komplit Spesial 48',
            quantity: 1,
            price: 28000,
            levelPedas: 3,
            toppings: [{ id: 'top-1', name: 'Telur Ayam (1 pcs)', price: 4000 }],
            subtotal: 32000,
          },
          {
            menuItemId: 'menu-6',
            menuItemName: 'Es Teh Manis Jumbo',
            quantity: 1,
            price: 5000,
            levelPedas: 0,
            toppings: [],
            subtotal: 5000,
          },
        ],
        totalAmount: 37000,
        paymentMethod: payMethod,
        cashReceived: payMethod === 'Tunai' ? 50000 : undefined,
        change: payMethod === 'Tunai' ? 13000 : undefined,
        status: 'Selesai',
        notes: 'Makan di tempat',
      });
    }
  });

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
