import React, { useState } from 'react';
import { StoreSettings, MenuItem, Ingredient, RecipeItem, TextScale } from '../types';
import { formatRupiah } from '../utils/formatters';
import {
  Store,
  Moon,
  Sun,
  Type,
  UtensilsCrossed,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  onSaveSettings: (settings: StoreSettings) => void;
  onSaveMenuItem: (menu: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  menuItems,
  ingredients,
  onSaveSettings,
  onSaveMenuItem,
  onDeleteMenuItem,
  onResetAllData,
}) => {
  // Store info state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Menu editor modal
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Recipe editor modal
  const [recipeSelectedMenu, setRecipeSelectedMenu] = useState<MenuItem | null>(null);

  // Reset confirmation & delete menu confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [deleteConfirmMenu, setDeleteConfirmMenu] = useState<MenuItem | null>(null);

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      storeName: storeName.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleToggleTheme = () => {
    onSaveSettings({
      ...settings,
      isDarkMode: !settings.isDarkMode,
    });
  };

  const handleSetTextScale = (scale: TextScale) => {
    onSaveSettings({
      ...settings,
      textScale: scale,
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Toast Notifikasi Berhasil Simpan */}
      {showSavedToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl font-bold text-xs animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          Pengaturan berhasil disimpan!
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
          Pengaturan Warung & Aplikasi
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Ubah informasi toko, konfigurasi menu dan resep, preferensi mode gelap, dan ukuran teks.
        </p>
      </div>

      {/* 1. Tampilan & Kenyamanan (Tema & Ukuran Teks untuk Segala Usia) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <Type className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            Tampilan & Kenyamanan Baca (Mudah Dibaca Segala Usia)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mode Terang / Gelap */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              Pilihan Mode Tampilan:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => settings.isDarkMode && handleToggleTheme()}
                className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                  !settings.isDarkMode
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Sun className="w-4 h-4" />
                Mode Terang
              </button>
              <button
                type="button"
                onClick={() => !settings.isDarkMode && handleToggleTheme()}
                className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                  settings.isDarkMode
                    ? 'bg-stone-800 text-white border-stone-700 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Moon className="w-4 h-4" />
                Mode Gelap
              </button>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
              Gunakan mode gelap saat malam hari agar tidak silau di mata kasir.
            </p>
          </div>

          {/* Ukuran Teks */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              Ukuran Teks Antarmuka:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Normal (15px)' },
                { id: 'large', label: 'Besar (17px)' },
                { id: 'xlarge', label: 'Sangat Besar' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSetTextScale(s.id as TextScale)}
                  className={`py-3 px-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                    settings.textScale === s.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
              Pilih &ldquo;Besar&rdquo; atau &ldquo;Sangat Besar&rdquo; jika ingin tulisan lebih jelas tanpa kacamata.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Informasi Warung */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <Store className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            Profil & Header Nota Warung
          </h3>
        </div>

        <form onSubmit={handleSaveStoreProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Nama Warung:
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Slogan / Deskripsi:
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Alamat Warung:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                Nomor Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Profil Warung
          </button>
        </form>
      </div>

      {/* 3. Daftar Menu & Resep Otomatis */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Daftar Menu & Takaran Resep Pengurang Stok
            </h3>
          </div>
          <button
            onClick={() => {
              setIsAddMenuOpen(true);
              setEditingMenu(null);
            }}
            className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Tambah Menu Baru
          </button>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          Setiap menu dapat diatur resep bahannya. Saat pesanan dicatat, stok bahan dalam resep akan dipotong secara otomatis.
        </p>

        {/* Tabel Menu & Tombol Atur Resep */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-3 px-4">Nama Menu</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">Bahan Resep Terdaftar</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {menuItems.map((menu) => (
                <tr key={menu.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                    {menu.name}
                  </td>
                  <td className="py-3 px-4 text-stone-500">{menu.category}</td>
                  <td className="py-3 px-4 font-black text-orange-600 dark:text-orange-400">
                    {formatRupiah(menu.basePrice)}
                  </td>
                  <td className="py-3 px-4 text-stone-600 dark:text-stone-300 text-xs">
                    {menu.recipe.length > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {menu.recipe.length} bahan terhubung
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Tanpa resep potong</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title="Atur Resep Takaran Bahan"
                        onClick={() => setRecipeSelectedMenu(menu)}
                        className="py-1 px-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-1 hover:bg-orange-100 transition cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Resep ({menu.recipe.length})
                      </button>
                      <button
                        title="Edit Menu"
                        onClick={() => setEditingMenu(menu)}
                        className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Hapus Menu"
                        onClick={() => setDeleteConfirmMenu(menu)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Reset Data Dummy (Untuk Uji Coba) */}
      <div className="bg-stone-100 dark:bg-stone-900/40 rounded-2xl p-5 border border-dashed border-stone-300 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-stone-500" />
            Reset / Muat Ulang Data Awal Demo
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Kembalikan semua bahan (24 bahan), 7 menu, dan 60+ data transaksi demo ke kondisi awal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="py-2 px-4 rounded-xl border border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition cursor-pointer"
        >
          Muat Ulang Data Dummy
        </button>
      </div>

      {/* MODAL: Tambah / Edit Menu */}
      {(isAddMenuOpen || editingMenu) && (
        <MenuFormModal
          menu={editingMenu}
          onClose={() => {
            setIsAddMenuOpen(false);
            setEditingMenu(null);
          }}
          onSave={(saved) => {
            onSaveMenuItem(saved);
            setIsAddMenuOpen(false);
            setEditingMenu(null);
          }}
        />
      )}

      {/* MODAL: Pengatur Resep per Menu */}
      {recipeSelectedMenu && (
        <RecipeEditorModal
          menu={recipeSelectedMenu}
          ingredients={ingredients}
          onClose={() => setRecipeSelectedMenu(null)}
          onSaveRecipe={(updatedRecipe) => {
            onSaveMenuItem({
              ...recipeSelectedMenu,
              recipe: updatedRecipe,
            });
            setRecipeSelectedMenu(null);
          }}
        />
      )}

      {/* MODAL: Konfirmasi Reset Data */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Muat Ulang Semua Data?
              </h4>
              <p className="text-xs text-stone-500">
                Data transaksi baru dan perubahan stok yang sudah Anda buat akan diganti kembali dengan data demo default Waroeng Seblak 48.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onResetAllData();
                  setIsResetConfirmOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ya, Muat Ulang
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Menu */}
      {deleteConfirmMenu && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Hapus Menu &ldquo;{deleteConfirmMenu.name}&rdquo;?
              </h4>
              <p className="text-xs text-stone-500">
                Menu ini akan dihapus dari daftar pilihan kasir.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDeleteMenuItem(deleteConfirmMenu.id);
                  setDeleteConfirmMenu(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setDeleteConfirmMenu(null)}
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

// Form Menu Component
interface MenuFormModalProps {
  menu: MenuItem | null;
  onClose: () => void;
  onSave: (menu: MenuItem) => void;
}

const MenuFormModal: React.FC<MenuFormModalProps> = ({ menu, onClose, onSave }) => {
  const isEditing = !!menu;
  const [name, setName] = useState(menu?.name || '');
  const [category, setCategory] = useState<'Seblak' | 'Minuman' | 'Ekstra'>(
    menu?.category || 'Seblak'
  );
  const [basePrice, setBasePrice] = useState<number>(menu?.basePrice || 15000);
  const [description, setDescription] = useState(menu?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: menu?.id || `menu-${Date.now()}`,
      name: name.trim(),
      category,
      basePrice,
      description: description.trim(),
      isAvailable: true,
      recipe: menu?.recipe || [],
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
            {isEditing ? 'Edit Menu' : 'Tambah Menu Baru'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Nama Menu:
            </label>
            <input
              type="text"
              required
              placeholder="Mis: Seblak Komplit Seafood..."
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
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              >
                <option value="Seblak">Seblak</option>
                <option value="Minuman">Minuman</option>
                <option value="Ekstra">Ekstra</option>
              </select>
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
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
              Deskripsi Singkat:
            </label>
            <textarea
              rows={2}
              placeholder="Mis: Isian kerupuk, kuah pedas gurih kencur..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Simpan Menu
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

// Recipe Editor Modal
interface RecipeEditorModalProps {
  menu: MenuItem;
  ingredients: Ingredient[];
  onClose: () => void;
  onSaveRecipe: (recipe: RecipeItem[]) => void;
}

const RecipeEditorModal: React.FC<RecipeEditorModalProps> = ({
  menu,
  ingredients,
  onClose,
  onSaveRecipe,
}) => {
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>([...menu.recipe]);
  const [selectedIngId, setSelectedIngId] = useState<string>(ingredients[0]?.id || '');
  const [amountInput, setAmountInput] = useState<number>(1);

  const selectedIng = ingredients.find((i) => i.id === selectedIngId);

  const handleAddIngredient = () => {
    if (!selectedIng || amountInput <= 0) return;

    const existsIndex = currentRecipe.findIndex((r) => r.ingredientId === selectedIng.id);
    if (existsIndex >= 0) {
      const updated = [...currentRecipe];
      updated[existsIndex].amount = amountInput;
      setCurrentRecipe(updated);
    } else {
      setCurrentRecipe([
        ...currentRecipe,
        {
          ingredientId: selectedIng.id,
          amount: amountInput,
          unit: selectedIng.unit,
        },
      ]);
    }
  };

  const handleRemoveIngredient = (ingId: string) => {
    setCurrentRecipe(currentRecipe.filter((r) => r.ingredientId !== ingId));
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Resep Takaran: {menu.name}
            </h3>
            <p className="text-xs text-stone-500">
              Bahan-bahan ini otomatis terpotong saat 1 porsi menu terjual
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Tambah Bahan ke Resep */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800 space-y-2">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
            Tambah Bahan ke Resep:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedIngId}
              onChange={(e) => setSelectedIngId(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="1"
              min="1"
              value={amountInput}
              onChange={(e) => setAmountInput(parseInt(e.target.value) || 0)}
              className="w-20 text-xs px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-center font-bold"
            />
            <button
              type="button"
              onClick={handleAddIngredient}
              className="py-2 px-3 rounded-xl bg-orange-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Pakai
            </button>
          </div>
        </div>

        {/* List Bahan dalam Resep */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentRecipe.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              Belum ada bahan yang dikaitkan ke resep menu ini.
            </div>
          ) : (
            currentRecipe.map((rec) => {
              const ing = ingredients.find((i) => i.id === rec.ingredientId);
              return (
                <div
                  key={rec.ingredientId}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {ing ? ing.name : 'Bahan'}
                    </span>
                    <span className="text-stone-500 ml-2">
                      ({ing?.category || 'Bahan'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-orange-600 dark:text-orange-400">
                      {rec.amount} {rec.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(rec.ingredientId)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex gap-2">
          <button
            type="button"
            onClick={() => onSaveRecipe(currentRecipe)}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            Simpan Resep Menu
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
