import React, { useState, useMemo } from 'react';
import { MenuItem } from '../types';
import { formatRupiah } from '../utils/formatters';
import { IngredientImage } from './IngredientIllustration';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Image as ImageIcon,
  Upload,
  Loader2,
  CupSoda,
  Filter,
  Check,
} from 'lucide-react';
import {
  uploadImageToGoogleDrive,
  formatGoogleDriveDirectUrl,
  isDriveUploadConfigured,
} from '../services/driveUpload';

interface DrinkMenuViewProps {
  menuItems: MenuItem[];
  onSaveMenuItem: (menu: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
}

export const DrinkMenuView: React.FC<DrinkMenuViewProps> = ({
  menuItems,
  onSaveMenuItem,
  onDeleteMenuItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [editingDrink, setEditingDrink] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingDrinkId, setDeletingDrinkId] = useState<string | null>(null);

  // Ambil hanya menu dengan kategori Minuman
  const drinks = useMemo(() => {
    return menuItems.filter((item) => item.category === 'Minuman');
  }, [menuItems]);

  // Statistik Ringkas
  const totalDrinks = drinks.length;
  const availableDrinks = drinks.filter((d) => d.isAvailable).length;
  const unavailableDrinks = totalDrinks - availableDrinks;
  const totalStockPcs = drinks.reduce((acc, d) => acc + (d.stock ?? 50), 0);

  // Filter & Search
  const filteredDrinks = useMemo(() => {
    return drinks.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'available'
          ? d.isAvailable
          : !d.isAvailable;

      return matchSearch && matchStatus;
    });
  }, [drinks, searchQuery, statusFilter]);

  const handleToggleAvailability = (drink: MenuItem) => {
    onSaveMenuItem({
      ...drink,
      isAvailable: !drink.isAvailable,
    });
  };

  const handleOpenAdd = () => {
    setEditingDrink(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (drink: MenuItem) => {
    setEditingDrink(drink);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingDrinkId) {
      onDeleteMenuItem(deletingDrinkId);
      setDeletingDrinkId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-600/25 shrink-0">
            <CupSoda className="w-6 h-6 stroke-[2.3]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Katalog Menu &amp; Minuman
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Kelola variasi minuman segar, harga jual, foto pendamping, dan ketersediaan di kasir &amp; pelanggan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Minuman Baru</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
            Total Minuman
          </span>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {totalDrinks} <span className="text-xs font-semibold text-stone-400">varian</span>
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
            Tersedia (Aktif)
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {availableDrinks} <span className="text-xs font-semibold text-emerald-500/80">menu</span>
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block uppercase tracking-wider">
            Habis / Non-aktif
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {unavailableDrinks} <span className="text-xs font-semibold text-rose-500/80">menu</span>
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
            Total Stok Fisik
          </span>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {totalStockPcs} <span className="text-xs font-semibold text-stone-400">pcs</span>
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau deskripsi minuman (contoh: Es Teh, Jeruk)..."
            className="w-full text-xs py-2 pl-9 pr-8 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1 hidden sm:block" />
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Semua ({totalDrinks})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Tersedia ({availableDrinks})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unavailable')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'unavailable'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Habis ({unavailableDrinks})
          </button>
        </div>
      </div>

      {/* Grid Menu Minuman */}
      {filteredDrinks.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 mx-auto flex items-center justify-center">
            <CupSoda className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            {searchQuery || statusFilter !== 'all'
              ? 'Tidak ada minuman yang sesuai filter'
              : 'Belum Ada Variasi Minuman'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Coba ubah kata kunci pencarian atau ubah filter status di atas.'
              : 'Klik tombol di bawah untuk menambahkan variasi minuman segar pertama Anda.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-2 py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Minuman Baru</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDrinks.map((drink) => {
            const hasDriveUrl =
              drink.imageUrl &&
              (drink.imageUrl.includes('googleusercontent.com') ||
                drink.imageUrl.includes('drive.google.com'));

            return (
              <div
                key={drink.id}
                className={`bg-white dark:bg-stone-900 rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden group ${
                  drink.isAvailable
                    ? 'border-stone-200 dark:border-stone-800 hover:border-orange-500/50'
                    : 'border-stone-200/60 dark:border-stone-800/60 opacity-75'
                }`}
              >
                {/* Media Foto Minuman */}
                <div>
                  <div className="relative h-40 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <IngredientImage
                      name={drink.name}
                      category="Minuman"
                      imageUrl={drink.imageUrl}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />

                    {/* Badge Google Drive CDN */}
                    {hasDriveUrl && (
                      <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span>Google Drive CDN</span>
                      </div>
                    )}

                    {/* Badge Status Ketersediaan */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                          drink.isAvailable
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {drink.isAvailable ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Tersedia</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 stroke-[2.5]" />
                            <span>Habis</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Konten & Deskripsi */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 leading-snug line-clamp-1">
                        {drink.name}
                      </h3>
                      <p className="font-black text-sm text-orange-600 dark:text-orange-400 shrink-0 tabular-nums">
                        {formatRupiah(drink.basePrice)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                      <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                        Sisa Stok:
                      </span>
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                          (drink.stock ?? 50) <= 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : (drink.stock ?? 50) <= 10
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {drink.stock ?? 50} {drink.unit || 'pcs'}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {drink.description || 'Minuman segar pelengkap sajian seblak hangat.'}
                    </p>
                  </div>
                </div>

                {/* Footer Kartu & Aksi */}
                <div className="p-3 bg-stone-50/80 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
                  {/* Tombol Cepat Ubah Status */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(drink)}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      drink.isAvailable
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                    }`}
                    title={
                      drink.isAvailable
                        ? 'Klik untuk menandai habis'
                        : 'Klik untuk menandai tersedia'
                    }
                  >
                    {drink.isAvailable ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{drink.isAvailable ? 'Aktif' : 'Non-aktif'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(drink)}
                      className="p-1.5 rounded-lg bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500 transition cursor-pointer"
                      title="Edit Minuman"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingDrinkId(drink.id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-stone-800 text-rose-600 dark:text-rose-400 border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-300 transition cursor-pointer"
                      title="Hapus Minuman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Minuman */}
      {isFormOpen && (
        <DrinkFormModal
          drink={editingDrink}
          onClose={() => setIsFormOpen(false)}
          onSave={(saved) => {
            onSaveMenuItem(saved);
            setIsFormOpen(false);
          }}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingDrinkId && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                  Hapus Minuman?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Menu minuman ini akan dihapus dari katalog kasir dan pelanggan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingDrinkId(null)}
                className="flex-1 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODAL FORM TAMBAH / EDIT MINUMAN
// (Mendukung upload tertunda ke Google Drive persis seperti pada Bahan/Topping)
// ============================================================================

interface DrinkFormModalProps {
  drink: MenuItem | null;
  onClose: () => void;
  onSave: (drink: MenuItem) => void;
}

const DrinkFormModal: React.FC<DrinkFormModalProps> = ({ drink, onClose, onSave }) => {
  const isEditing = Boolean(drink);

  const [name, setName] = useState(drink?.name || '');
  const [basePrice, setBasePrice] = useState<number>(drink?.basePrice || 5000);
  const [description, setDescription] = useState(drink?.description || '');
  const [stock, setStock] = useState<number>(drink?.stock ?? 50);
  const [unit, setUnit] = useState<string>(drink?.unit || 'pcs');
  const [isAvailable, setIsAvailable] = useState<boolean>(drink?.isAvailable ?? true);
  const [imageUrl, setImageUrl] = useState<string>(drink?.imageUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setSelectedFile(file);

    // Baca file secara lokal HANYA untuk pratinjau
    // Foto BELUM diunggah ke Google Drive sampai tombol 'Simpan Minuman' ditekan
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setUploadSuccess(`Foto "${file.name}" dipilih. Foto akan diunggah saat Anda klik Simpan Minuman.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlInput = (val: string) => {
    const formatted = formatGoogleDriveDirectUrl(val);
    setImageUrl(formatted);
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalImageUrl = imageUrl.trim();

    // HANYA UNGGAH KE GOOGLE DRIVE JIKA ADA FILE BARU YANG DIPILIH
    if (selectedFile && isDriveUploadConfigured()) {
      setIsSaving(true);
      setUploadError(null);
      setUploadSuccess(null);
      try {
        const res = await uploadImageToGoogleDrive(selectedFile);
        if (res.success && res.imageUrl) {
          finalImageUrl = res.imageUrl;
        } else {
          setUploadError(res.error || 'Gagal mengunggah foto ke Google Drive.');
          setIsSaving(false);
          return; // Hentikan penyimpanan agar user dapat melihat error atau mencoba lagi
        }
      } catch (err: any) {
        setUploadError(err.message || 'Terjadi kesalahan saat mengunggah foto ke Google Drive.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    onSave({
      id: drink?.id || `drink-${Date.now()}`,
      name: name.trim(),
      category: 'Minuman',
      basePrice: Number(basePrice) || 0,
      description: description.trim(),
      isAvailable: isAvailable && stock > 0,
      stock: Number(stock) || 0,
      unit: (unit || 'pcs').trim(),
      imageUrl: finalImageUrl || undefined,
      recipe: drink?.recipe || [],
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
              <CupSoda className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              {isEditing ? 'Edit Variasi Minuman' : 'Tambah Minuman Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Pratinjau & Upload Gambar Minuman */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                Foto Minuman
              </span>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setSelectedFile(null);
                    setUploadSuccess(null);
                    setUploadError(null);
                  }}
                  className="text-[11px] text-red-500 hover:underline cursor-pointer"
                >
                  Gunakan Ilustrasi Bawaan
                </button>
              )}
            </label>

            <div className="relative h-32 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
              <IngredientImage
                name={name || 'Minuman Seblak'}
                category="Minuman"
                imageUrl={imageUrl}
                className="w-full h-full object-cover"
              />

              {selectedFile ? (
                <div className="absolute top-2 left-2 bg-orange-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <span>Pratinjau (Upload saat Simpan)</span>
                </div>
              ) : (
                imageUrl &&
                (imageUrl.includes('googleusercontent.com') ||
                  imageUrl.includes('drive.google.com')) && (
                  <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span>Google Drive CDN</span>
                  </div>
                )
              )}
            </div>

            {/* Tombol Upload & Input URL */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <label
                  className={`flex-1 py-2 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-orange-500 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-1.5 transition ${
                    isSaving
                      ? 'opacity-50 cursor-not-allowed bg-stone-100'
                      : 'cursor-pointer bg-stone-50 dark:bg-stone-800/50'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-orange-600" />
                  <span>
                    {selectedFile
                      ? `Foto Terpilih: ${selectedFile.name}`
                      : 'Pilih Foto dari HP/Laptop'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isSaving}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Input Direct Link */}
              <div>
                <input
                  type="text"
                  placeholder="Atau tempel Link Foto / Google Drive..."
                  value={imageUrl}
                  onChange={(e) => handleUrlInput(e.target.value)}
                  className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 placeholder:text-stone-400 focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 block">
                  Link Google Drive akan otomatis diubah menjadi format direct display CDN.
                </span>
              </div>

              {/* Alert Feedback */}
              {uploadError && (
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[11px] text-red-600 dark:text-red-400 font-medium">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {uploadSuccess}
                </div>
              )}
            </div>
          </div>

          {/* Form Input Data Minuman */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Nama Minuman:
            </label>
            <input
              type="text"
              required
              placeholder="Mis: Es Teh Manis Jumbo, Es Jeruk Peras..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Harga Jual (Rp):
            </label>
            <input
              type="number"
              step="500"
              min="0"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(parseInt(e.target.value) || 0)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Stok Saat Ini:
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Satuan:
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  (Otomatis)
                </span>
              </div>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                value={unit || 'pcs'}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 cursor-not-allowed select-none font-semibold focus:outline-none"
                title="Satuan minuman diatur tetap 'pcs' dan tidak dapat diubah"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Deskripsi Minuman (Opsional):
            </label>
            <textarea
              rows={2}
              placeholder="Mis: Es teh manis melati segar penawar pedas seblak..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Status Ketersediaan Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 dark:border-stone-700"
              />
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Tersedia untuk dipesan di kasir &amp; layar pelanggan
              </span>
            </label>
          </div>

          {/* Tombol Simpan & Batal */}
          <div className="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah Foto &amp; Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Minuman</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

