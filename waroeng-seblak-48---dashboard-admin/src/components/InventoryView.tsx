import React, { useState, useMemo } from 'react';
import { Ingredient, IngredientCategory, StockLog } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { getStockLogs } from '../services/storage';
import { IngredientImage } from './IngredientIllustration';
import {
  Search,
  Plus,
  Minus,
  AlertTriangle,
  History,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  PackageCheck,
  X,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';

interface InventoryViewProps {
  ingredients: Ingredient[];
  onSaveIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
  onAdjustStock: (id: string, amount: number, type: 'masuk' | 'keluar', note: string) => void;
  targetQuickRestockId?: string | null;
  onClearTargetQuickRestock?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  ingredients,
  onSaveIngredient,
  onDeleteIngredient,
  onAdjustStock,
  targetQuickRestockId,
  onClearTargetQuickRestock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');

  // Modals state
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick Adjustment modal
  const [adjustingIngredient, setAdjustingIngredient] = useState<{
    ingredient: Ingredient;
    type: 'masuk' | 'keluar';
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustNote, setAdjustNote] = useState<string>('');

  // History modal
  const [viewHistoryIngredient, setViewHistoryIngredient] = useState<Ingredient | null>(null);
  const [historyLogs, setHistoryLogs] = useState<StockLog[]>([]);

  // Open quick restock if requested externally
  React.useEffect(() => {
    if (targetQuickRestockId) {
      const found = ingredients.find((i) => i.id === targetQuickRestockId);
      if (found) {
        setAdjustingIngredient({ ingredient: found, type: 'masuk' });
        setAdjustAmount(found.minStock > 0 ? found.minStock : 1);
        setAdjustNote('Restock belanja bahan');
      }
      if (onClearTargetQuickRestock) onClearTargetQuickRestock();
    }
  }, [targetQuickRestockId, ingredients, onClearTargetQuickRestock]);

  const categories: (IngredientCategory | 'Semua')[] = [
    'Semua',
    'Kerupuk',
    'Frozen Food',
    'Keringan',
    'Daging',
    'Minuman',
    'Special',
  ];

  // Filtering
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [ingredients, searchQuery, selectedCategory, selectedStatus]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: ingredients.length,
      aman: ingredients.filter((i) => i.status === 'aman').length,
      menipis: ingredients.filter((i) => i.status === 'menipis').length,
      habis: ingredients.filter((i) => i.status === 'habis').length,
    };
  }, [ingredients]);

  const handleOpenHistory = (ing: Ingredient) => {
    setViewHistoryIngredient(ing);
    setHistoryLogs(getStockLogs(ing.id));
  };

  const handleConfirmAdjust = () => {
    if (!adjustingIngredient || adjustAmount <= 0) return;
    onAdjustStock(
      adjustingIngredient.ingredient.id,
      adjustAmount,
      adjustingIngredient.type,
      adjustNote.trim() ||
        (adjustingIngredient.type === 'masuk' ? 'Tambah stok belanja' : 'Pemakaian/rusak')
    );
    setAdjustingIngredient(null);
    setAdjustAmount(1);
    setAdjustNote('');
  };

  const handleDelete = (id: string) => {
    onDeleteIngredient(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tombol Tambah Bahan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Manajemen Stok Bahan
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Pantau stok bahan dalam tampilan kartu bergambar, batas minimum, dan riwayat mutasi stok.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setEditingIngredient(null);
          }}
          className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tambah Bahan Baru
        </button>
      </div>

      {/* Ringkasan Status Bahan (Filter Cepat) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedStatus('Semua')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedStatus === 'Semua'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 border-stone-900 shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-400'
          }`}
        >
          <div className="text-xs font-semibold opacity-80">Total Bahan</div>
          <div className="text-xl font-black mt-1">{counts.total} Item</div>
        </div>

        <div
          onClick={() => setSelectedStatus('aman')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedStatus === 'aman'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-emerald-500'
          }`}
        >
          <div
            className={`text-xs font-semibold flex items-center gap-1 ${
              selectedStatus === 'aman'
                ? 'text-white'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Stok Aman
          </div>
          <div
            className={`text-xl font-black mt-1 ${
              selectedStatus === 'aman'
                ? 'text-white'
                : 'text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {counts.aman} Item
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('menipis')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedStatus === 'menipis'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-amber-500'
          }`}
        >
          <div
            className={`text-xs font-semibold flex items-center gap-1 ${
              selectedStatus === 'menipis'
                ? 'text-white'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stok Menipis
          </div>
          <div
            className={`text-xl font-black mt-1 ${
              selectedStatus === 'menipis'
                ? 'text-white'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {counts.menipis} Item
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('habis')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedStatus === 'habis'
              ? 'bg-red-600 text-white border-red-600 shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-red-500'
          }`}
        >
          <div
            className={`text-xs font-semibold flex items-center gap-1 ${
              selectedStatus === 'habis' ? 'text-white' : 'text-red-600 dark:text-red-400'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Stok Habis
          </div>
          <div
            className={`text-xl font-black mt-1 ${
              selectedStatus === 'habis' ? 'text-white' : 'text-red-700 dark:text-red-300'
            }`}
          >
            {counts.habis} Item
          </div>
        </div>
      </div>

      {/* Bar Pencarian & Filter Kategori */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama bahan (misal: Kerupuk, Cabai, Ceker)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs Kategori */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-stone-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Kategori:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID KARTU BAHAN (Tampilan Card per Bahan untuk Semua Perangkat) */}
      {filteredIngredients.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-12 text-center text-stone-400 space-y-2 shadow-xs">
          <PackageCheck className="w-12 h-12 mx-auto stroke-[1.5]" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
            Tidak ada bahan yang cocok dengan pencarian atau filter.
          </p>
          <p className="text-xs">Coba ubah kata kunci atau ganti filter kategori.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {filteredIngredients.map((item) => {
            const stockRatio =
              item.minStock > 0
                ? Math.min(100, Math.round((item.currentStock / (item.minStock * 2)) * 100))
                : 100;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-stone-900 rounded-xl sm:rounded-2xl border overflow-hidden shadow-2xs sm:shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  item.status === 'habis'
                    ? 'border-red-300 dark:border-red-900/70'
                    : item.status === 'menipis'
                    ? 'border-amber-300 dark:border-amber-900/70'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                <div>
                  {/* Bagian Gambar Kartu + Overlay Informasi Kategori & Status */}
                  <div className="relative h-20 sm:h-36 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden border-b border-stone-100 dark:border-stone-800">
                    <IngredientImage
                      name={item.name}
                      category={item.category}
                      imageUrl={item.imageUrl}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />

                    {/* Label Kategori di Kiri Atas */}
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold text-stone-700 dark:text-stone-200 shadow-2xs truncate max-w-[56%]">
                      {item.category}
                    </div>

                    {/* Label Status di Kanan Atas */}
                    <div
                      className={`absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-extrabold shadow-2xs flex items-center gap-0.5 sm:gap-1 ${
                        item.status === 'habis'
                          ? 'bg-red-600 text-white'
                          : item.status === 'menipis'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {item.status === 'habis' && <XCircle className="hidden sm:block w-3 h-3" />}
                      {item.status === 'menipis' && <AlertTriangle className="hidden sm:block w-3 h-3" />}
                      {item.status === 'aman' && <CheckCircle2 className="hidden sm:block w-3 h-3" />}
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </div>

                  {/* Detail Informasi Bahan */}
                  <div className="p-2 sm:p-3.5 space-y-1.5 sm:space-y-2.5">
                    <div>
                      <h3
                        className="font-extrabold text-[11px] sm:text-sm text-stone-900 dark:text-stone-100 leading-snug wrap-break-word"
                      >
                        {item.name}
                      </h3>
                      <p className="hidden sm:block text-[10px] text-stone-400 mt-0.5">
                        Diperbarui: {formatIndonesianDate(item.updatedAt, false)}
                      </p>
                    </div>

                    {/* Kotak Stok Saat Ini & Batas Minimum */}
                    <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/70 dark:border-stone-800 space-y-1 sm:space-y-2">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[9px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400">
                          Stok:
                        </span>
                        <span
                          className={`text-xs sm:text-base font-black ${
                            item.status === 'habis'
                              ? 'text-red-600 dark:text-red-400'
                              : item.status === 'menipis'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {item.currentStock}{' '}
                          <span className="text-[9px] sm:text-xs font-bold">{item.unit}</span>
                        </span>
                      </div>

                      {/* Progress Bar Visual Stok */}
                      <div className="w-full h-1 sm:h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.status === 'habis'
                              ? 'bg-red-600'
                              : item.status === 'menipis'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(item.currentStock > 0 ? 8 : 0, stockRatio)}%` }}
                        />
                      </div>

                      {/* Rincian Tabel Mini di Dalam Card */}
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-0.5 sm:gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[9px] sm:text-[11px]">
                        <div className="flex sm:block items-center justify-between">
                          <span className="text-[8px] sm:text-[10px] text-stone-400 block">Min:</span>
                          <span className="font-bold text-stone-700 dark:text-stone-300">
                            {item.minStock} {item.unit}
                          </span>
                        </div>
                        <div className="flex sm:block items-center justify-between sm:text-right">
                          <span className="text-[8px] sm:text-[10px] text-stone-400 block">Harga:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400 truncate">
                            {formatRupiah(item.lastPurchasePrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Cepat di Bagian Bawah Kartu */}
                <div className="px-2 pb-2 pt-0.5 sm:px-3.5 sm:pb-3.5 sm:pt-1 space-y-1.5 sm:space-y-2">
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    <button
                      onClick={() => {
                        setAdjustingIngredient({ ingredient: item, type: 'masuk' });
                        setAdjustAmount(item.minStock > 0 ? item.minStock : 1);
                        setAdjustNote('Beli kulakan pasar');
                      }}
                      title="Tambah Stok"
                      aria-label="Tambah Stok"
                      className="py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    </button>

                    <button
                      onClick={() => {
                        setAdjustingIngredient({ ingredient: item, type: 'keluar' });
                        setAdjustAmount(1);
                        setAdjustNote('Pemakaian manual');
                      }}
                      title="Kurangi Stok"
                      aria-label="Kurangi Stok"
                      className="py-1.5 sm:py-2 px-2 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => handleOpenHistory(item)}
                      className="py-1 px-1.5 sm:py-1 sm:px-2 rounded-md sm:rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-[9px] sm:text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Riwayat Perubahan Stok"
                    >
                      <History className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Riwayat</span>
                    </button>

                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => setEditingIngredient(item)}
                        className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition cursor-pointer"
                        title="Edit Bahan & Gambar"
                      >
                        <Edit2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 sm:p-1.5 rounded-md sm:rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-400 hover:text-red-600 transition cursor-pointer"
                        title="Hapus Bahan"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah / Edit Bahan */}
      {(isAddModalOpen || editingIngredient) && (
        <IngredientFormModal
          ingredient={editingIngredient}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingIngredient(null);
          }}
          onSave={(saved) => {
            onSaveIngredient(saved);
            setIsAddModalOpen(false);
            setEditingIngredient(null);
          }}
        />
      )}

      {/* MODAL: Quick Adjustment (Tambah / Kurangi Stok dengan Catatan Alasan) */}
      {adjustingIngredient && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  {adjustingIngredient.type === 'masuk' ? (
                    <Plus className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-amber-600" />
                  )}
                  {adjustingIngredient.type === 'masuk'
                    ? 'Tambah Stok Masuk'
                    : 'Kurangi Stok (Pemakaian/Rusak)'}
                </h3>
                <p className="text-xs text-stone-500">{adjustingIngredient.ingredient.name}</p>
              </div>
              <button
                onClick={() => setAdjustingIngredient(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                  Jumlah ({adjustingIngredient.ingredient.unit}):
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                  Catatan / Alasan:
                </label>
                <input
                  type="text"
                  placeholder={
                    adjustingIngredient.type === 'masuk'
                      ? 'Misal: Belanja dari Pasar Pagi'
                      : 'Misal: Terbuang / basi / salah takar / opname'
                  }
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                />
                {/* Preset Catatan Cepat */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(adjustingIngredient.type === 'masuk'
                    ? ['Belanja Pasar', 'Restock Supplier', 'Penyesuaian Opname']
                    : ['Rusak / Basi', 'Pemakaian Harian', 'Terbuang', 'Penyesuaian Opname']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustNote(preset)}
                      className="text-[10px] py-0.5 px-2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prediksi Stok Baru */}
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 text-xs flex justify-between items-center">
                <span className="text-stone-500">Stok Saat Ini:</span>
                <span className="font-bold">
                  {adjustingIngredient.ingredient.currentStock} {adjustingIngredient.ingredient.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 text-xs flex justify-between items-center">
                <span className="text-orange-900 dark:text-orange-200 font-semibold">
                  Perkiraan Stok Baru:
                </span>
                <span className="font-black text-sm text-orange-600 dark:text-orange-400">
                  {adjustingIngredient.type === 'masuk'
                    ? Math.round((adjustingIngredient.ingredient.currentStock + adjustAmount) * 100) / 100
                    : Math.max(
                        0,
                        Math.round((adjustingIngredient.ingredient.currentStock - adjustAmount) * 100) / 100
                      )}{' '}
                  {adjustingIngredient.ingredient.unit}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Konfirmasi Perubahan
              </button>
              <button
                type="button"
                onClick={() => setAdjustingIngredient(null)}
                className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Riwayat Perubahan Stok Per Bahan */}
      {viewHistoryIngredient && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-600" />
                  Riwayat Mutasi Stok: {viewHistoryIngredient.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Stok saat ini: {viewHistoryIngredient.currentStock} {viewHistoryIngredient.unit}
                </p>
              </div>
              <button
                onClick={() => setViewHistoryIngredient(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {historyLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">
                  Belum ada catatan mutasi untuk bahan ini.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200/70 dark:border-stone-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">{formatIndonesianDate(log.date)}</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          log.type === 'masuk'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {log.type === 'masuk' ? '+' : '-'} {log.amount} {log.unit}
                      </span>
                    </div>
                    <div className="text-stone-700 dark:text-stone-300 font-medium">{log.note}</div>
                    <div className="text-[10px] text-stone-400">
                      Sisa sesudah mutasi: {log.balanceAfter} {log.unit}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 text-right">
              <button
                onClick={() => setViewHistoryIngredient(null)}
                className="py-1.5 px-4 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Bahan */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Hapus Bahan Ini?
              </h4>
              <p className="text-xs text-stone-500">
                Bahan yang dihapus tidak akan dapat dipantau lagi di sistem. Pastikan bahan sudah tidak terdaftar di resep menu.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Form Component untuk Tambah & Edit Bahan (Termasuk Upload/Ganti Gambar)
interface IngredientFormModalProps {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSave: (ingredient: Ingredient) => void;
}

const IngredientFormModal: React.FC<IngredientFormModalProps> = ({
  ingredient,
  onClose,
  onSave,
}) => {
  const isEditing = !!ingredient;
  const [name, setName] = useState(ingredient?.name || '');
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category || 'Kerupuk');
  const [currentStock, setCurrentStock] = useState<number>(ingredient?.currentStock ?? 50);
  const [unit, setUnit] = useState(ingredient?.unit || 'pcs');
  const [minStock, setMinStock] = useState<number>(ingredient?.minStock ?? 20);
  const [lastPurchasePrice, setLastPurchasePrice] = useState<number>(
    ingredient?.lastPurchasePrice || 1000
  );
  const [imageUrl, setImageUrl] = useState<string>(ingredient?.imageUrl || '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: ingredient?.id || `ing-${Date.now()}`,
      name: name.trim(),
      category,
      currentStock,
      unit: unit.trim(),
      minStock,
      lastPurchasePrice,
      status: currentStock <= 0 ? 'habis' : currentStock <= minStock ? 'menipis' : 'aman',
      updatedAt: new Date().toISOString(),
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            {isEditing ? 'Edit Data & Gambar Bahan' : 'Tambah Bahan Baru'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Preview Gambar Bahan */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                Gambar Bahan
              </span>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-red-500 hover:underline cursor-pointer"
                >
                  Gunakan Ilustrasi Bawaan
                </button>
              )}
            </label>

            <div className="relative h-32 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
              <IngredientImage
                name={name || 'Bahan Seblak'}
                category={category}
                imageUrl={imageUrl}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2">
              <label className="flex-1 py-2 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-orange-500 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer bg-stone-50 dark:bg-stone-800/50 transition">
                <Upload className="w-3.5 h-3.5 text-orange-600" />
                <span>Pilih Foto dari HP/Laptop</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Nama Bahan:
            </label>
            <input
              type="text"
              required
              placeholder="Mis: Kerupuk Bawang, Ceker Ayam..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Kategori:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              >
                <option value="Kerupuk">Kerupuk</option>
                <option value="Frozen Food">Frozen Food</option>
                <option value="Keringan">Keringan</option>
                <option value="Daging">Daging</option>
                <option value="Minuman">Minuman</option>
                <option value="Special">Special</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Satuan:
              </label>
              <input
                type="text"
                required
                placeholder="pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Stok Saat Ini:
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Batas Minimum:
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Harga Beli Terakhir (Rp):
            </label>
            <input
              type="number"
              step="100"
              min="0"
              required
              value={lastPurchasePrice}
              onChange={(e) => setLastPurchasePrice(parseInt(e.target.value) || 0)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Simpan Bahan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
