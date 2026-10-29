import React, { useState, useMemo } from 'react';
import { Ingredient, Transaction, MenuItem } from '../types';
import { formatRupiah, formatShortDate } from '../utils/formatters';
import { ChartComponent } from './ChartComponent';
import { IngredientImage } from './IngredientIllustration';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  XCircle,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  ingredients: Ingredient[];
  transactions: Transaction[];
  menuItems: MenuItem[];
  onNavigateToTab: (tab: string) => void;
  onQuickRestock: (ingredient: Ingredient) => void;
  onSelectTransaction: (transaction: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ingredients,
  transactions,
  menuItems,
  onNavigateToTab,
  onQuickRestock,
  onSelectTransaction,
}) => {
  // State untuk visibilitas Hero Banner (dapat ditutup dan disimpan preferensinya)
  const [isHeroBannerVisible, setIsHeroBannerVisible] = useState<boolean>(() => {
    return localStorage.getItem('seblak48_hide_hero_banner') !== 'true';
  });

  // Waktu hari ini (October 19, 2026 dalam konteks data/simulasi atau hari ini)
  const todayDateStr = useMemo(() => {
    // Ambil tanggal transaksi paling baru sebagai anchor hari operasional
    if (transactions.length > 0) {
      return transactions[0].date.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [transactions]);

  // Transaksi hari ini
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(todayDateStr));
  }, [transactions, todayDateStr]);

  // Total omset hari ini
  const todayRevenue = useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  }, [todayTransactions]);

  // Transaksi kemarin untuk komparasi persentase
  const yesterdayRevenue = useMemo(() => {
    const yesterday = new Date(todayDateStr);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const yTxs = transactions.filter((t) => t.date.startsWith(yStr));
    return yTxs.reduce((acc, t) => acc + t.totalAmount, 0);
  }, [transactions, todayDateStr]);

  const revenueGrowthPct = useMemo(() => {
    if (yesterdayRevenue === 0) return 0;
    return Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
  }, [todayRevenue, yesterdayRevenue]);

  // Rata-rata nilai transaksi hari ini
  const avgOrderValue = useMemo(() => {
    if (todayTransactions.length === 0) return 0;
    return Math.round(todayRevenue / todayTransactions.length);
  }, [todayRevenue, todayTransactions]);

  // Bahan menipis atau habis
  const lowStockIngredients = useMemo(() => {
    return ingredients.filter((ing) => ing.currentStock <= ing.minStock);
  }, [ingredients]);

  // Menu terlaris hari ini
  const topSellingMenuToday = useMemo(() => {
    const salesMap: { [menuId: string]: { name: string; quantity: number; revenue: number } } = {};

    todayTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!salesMap[item.menuItemId]) {
          salesMap[item.menuItemId] = {
            name: item.menuItemName,
            quantity: 0,
            revenue: 0,
          };
        }
        salesMap[item.menuItemId].quantity += item.quantity;
        salesMap[item.menuItemId].revenue += item.subtotal;
      });
    });

    return Object.values(salesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4);
  }, [todayTransactions]);

  // Data 7 hari terakhir untuk grafik omset
  const chart7DaysData = useMemo(() => {
    const labels: string[] = [];
    const values: number[] = [];
    const anchor = new Date(todayDateStr);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      // Format label hari (Sen 13, Sel 14 dst)
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const label = `${dayNames[d.getDay()]} (${formatShortDate(d)})`;
      labels.push(label);

      const dayRevenue = transactions
        .filter((t) => t.date.startsWith(dStr))
        .reduce((sum, t) => sum + t.totalAmount, 0);
      values.push(dayRevenue);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Omset Harian (Rp)',
          data: values,
          borderColor: '#ea580c', // Orange-600
          backgroundColor: 'rgba(234, 88, 12, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#c2410c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [transactions, todayDateStr]);

  return (
    <div className="space-y-6">
      {/* Banner Sapaan Hero Section (Bisa Ditutup dengan Tombol X di Kanan Atas) */}
      {isHeroBannerVisible && (
        <div className="relative bg-linear-to-r from-orange-600 via-amber-600 to-red-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-orange-600/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          {/* Tombol Tutup (X) di Kanan Atas */}
          <button
            type="button"
            onClick={() => {
              setIsHeroBannerVisible(false);
              localStorage.setItem('seblak48_hide_hero_banner', 'true');
            }}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-black/15 hover:bg-black/30 active:scale-95 text-white/90 hover:text-white transition cursor-pointer backdrop-blur-xs"
            title="Tutup banner ini"
            aria-label="Tutup banner hero"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          <div className="space-y-1 pr-8 sm:pr-0">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full">
                Waroeng Seblak 48
              </span>
              <span className="text-xs text-orange-100 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Operasional Aktif
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              Dashboard Stok &amp; Omset Warung
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 max-w-xl">
              Pantau ketersediaan bahan racik seblak, rekap penjualan harian, dan riwayat transaksi warung dengan mudah.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('stok')}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white text-orange-700 font-black text-sm shadow-md hover:bg-orange-50 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:mr-6"
          >
            <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
            <span>Kelola Stok Bahan</span>
          </button>
        </div>
      )}

      {/* 4 Kartu Statistik Utama - 2 Kolom Berdampingan di Mobile, 4 Kolom di Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Omset Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 leading-tight">
              Omset Hari Ini
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100 truncate">
              {formatRupiah(todayRevenue)}
            </div>
            <div className="flex items-center flex-wrap gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
              {revenueGrowthPct >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />+{revenueGrowthPct}%
                </span>
              ) : (
                <span className="text-red-500 font-bold flex items-center">
                  {revenueGrowthPct}%
                </span>
              )}
              <span className="text-stone-400">vs kemarin</span>
            </div>
          </div>
        </div>

        {/* 2. Jumlah Transaksi Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 leading-tight">
              Transaksi Hari Ini
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              {todayTransactions.length}{' '}
              <span className="text-xs sm:text-sm font-semibold text-stone-500">Nota</span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1.5 sm:mt-2 line-clamp-1">
              Rata-rata 2-3 porsi/nota
            </p>
          </div>
        </div>

        {/* 3. Rata-rata Nilai Transaksi */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 leading-tight">
              Rata-rata Transaksi
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100 truncate">
              {formatRupiah(avgOrderValue)}
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1.5 sm:mt-2 line-clamp-1">
              Per struk belanja seblak
            </p>
          </div>
        </div>

        {/* 4. Bahan Stok Menipis / Habis */}
        <div
          onClick={() => onNavigateToTab('stok')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-sm transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 leading-tight">
              Bahan Perlu Belanja
            </span>
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                lowStockIngredients.length > 0
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 animate-pulse'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-baseline gap-1.5">
              <span>{lowStockIngredients.length}</span>
              <span className="text-xs sm:text-sm font-semibold text-stone-500">Bahan</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
              <span className="text-red-500 font-semibold truncate">
                {lowStockIngredients.filter((i) => i.currentStock === 0).length} Habis ·{' '}
                {lowStockIngredients.filter((i) => i.currentStock > 0).length} Menipis
              </span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-400 group-hover:translate-x-1 transition shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Tengah: Grafik Omset 7 Hari (Full Width di Mobile) + Menu Terlaris Hari Ini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Grafik Omset 7 Hari - Tetap 1 Kolom Penuh di Mobile */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                Tren Omset 7 Hari Terakhir
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                Pola penjualan harian Waroeng Seblak 48
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('laporan')}
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              Laporan Detail
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ChartComponent type="line" data={chart7DaysData} height={250} />
        </div>

        {/* Menu Terlaris Hari Ini - Item dibuat 2 kolom berdampingan di Mobile */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Menu Terlaris Hari Ini
              </h3>
            </div>

            {topSellingMenuToday.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">
                Belum ada menu yang terjual hari ini.
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                {topSellingMenuToday.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-100 dark:border-stone-800 gap-1.5"
                  >
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-extrabold text-[10px] sm:text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          {item.quantity} porsi terjual
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 sm:text-stone-900 sm:dark:text-stone-200 shrink-0">
                      {formatRupiah(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 sm:pt-4 border-t border-stone-100 dark:border-stone-800 mt-3 sm:mt-4">
            <button
              onClick={() => onNavigateToTab('riwayat')}
              className="w-full py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Riwayat Transaksi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bahan Perlu Segera Dibeli (Tampilan Card Kecil Seperti di Menu Stok) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="font-bold text-xs sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
              <span>Bahan Perlu Segera Dibeli (Stok &le; Min)</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400">
              Peringatan otomatis stok di bawah batas aman
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('stok')}
            className="text-[11px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            Semua Stok
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lowStockIngredients.length === 0 ? (
          <div className="p-4 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-950/40 rounded-xl">
            Semua stok bahan dalam status aman. Tidak ada yang mendesak.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
            {lowStockIngredients.slice(0, 6).map((ing) => {
              const stockRatio =
                ing.minStock > 0
                  ? Math.min(100, Math.round((ing.currentStock / (ing.minStock * 2)) * 100))
                  : 100;
              const isHabis = ing.currentStock === 0 || ing.status === 'habis';

              return (
                <div
                  key={ing.id}
                  className={`bg-white dark:bg-stone-900 rounded-xl border overflow-hidden shadow-2xs hover:shadow-sm transition flex flex-col justify-between ${
                    isHabis
                      ? 'border-red-300 dark:border-red-900/70'
                      : 'border-amber-300 dark:border-amber-900/70'
                  }`}
                >
                  <div>
                    {/* Gambar Bahan Kecil + Badge Kategori & Status */}
                    <div className="relative h-24 sm:h-28 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden border-b border-stone-100 dark:border-stone-800">
                      <IngredientImage
                        name={ing.name}
                        category={ing.category}
                        imageUrl={ing.imageUrl}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />

                      {/* Kategori Kiri Atas */}
                      <div className="absolute top-1.5 left-1.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold text-stone-700 dark:text-stone-200 shadow-2xs">
                        {ing.category}
                      </div>

                      {/* Status Kanan Atas */}
                      <div
                        className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold shadow-2xs flex items-center gap-0.5 ${
                          isHabis ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isHabis ? (
                          <XCircle className="w-2.5 h-2.5" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        )}
                        <span>{isHabis ? 'Habis' : 'Menipis'}</span>
                      </div>
                    </div>

                    {/* Informasi Ringkas Bahan */}
                    <div className="p-2.5 space-y-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate leading-snug">
                        {ing.name}
                      </h4>

                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200/70 dark:border-stone-800 space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                            Stok:
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-black ${
                              isHabis
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {ing.currentStock}{' '}
                            <span className="text-[10px] font-bold">{ing.unit}</span>
                          </span>
                        </div>

                        {/* Progress Bar Mini */}
                        <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHabis ? 'bg-red-600' : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${Math.max(ing.currentStock > 0 ? 10 : 0, stockRatio)}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[9px] sm:text-[10px]">
                          <span className="text-stone-500 dark:text-stone-400">
                            Min: <strong className="text-stone-700 dark:text-stone-300">{ing.minStock} {ing.unit}</strong>
                          </span>
                          <span className="font-bold text-orange-600 dark:text-orange-400 truncate">
                            {formatRupiah(ing.lastPurchasePrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Cepat Tambah Stok */}
                  <div className="px-2.5 pb-2.5">
                    <button
                      onClick={() => onQuickRestock(ing)}
                      className="w-full py-1.5 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] sm:text-xs shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3 h-3 shrink-0" />
                      <span>Tambah Stok</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
