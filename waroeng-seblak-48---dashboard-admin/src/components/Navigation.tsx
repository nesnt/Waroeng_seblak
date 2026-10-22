import React, { useState } from 'react';
import { StoreSettings, UserAccountStatus } from '../types';
import {
  LayoutDashboard,
  Boxes,
  ReceiptText,
  BarChart3,
  Settings,
  Flame,
  Moon,
  Sun,
  User,
  ShieldCheck,
  Mail,
  ChevronRight,
  Check,
  X,
  Edit2,
  LogOut,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  settings: StoreSettings;
  onToggleTheme: () => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
  onLogout?: () => void;
  lowStockCount: number;
}

const STATUS_CONFIG: Record<
  UserAccountStatus,
  { label: string; dotClass: string; badgeClass: string; desc: string }
> = {
  Online: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    desc: 'Aktif memantau operasional warung',
  },
  Sibuk: {
    label: 'Sibuk',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    desc: 'Sedang meracik / melayani pesanan ramai',
  },
  Istirahat: {
    label: 'Istirahat',
    dotClass: 'bg-stone-400',
    badgeClass:
      'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700',
    desc: 'Sedang jeda / istirahat sejenak',
  },
};

export const DesktopSidebar: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  settings,
  onToggleTheme,
  onUpdateSettings,
  onLogout,
  lowStockCount,
}) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const userName = settings.userName || 'Nabil Rachman';
  const userRole = settings.userRole || 'Pemilik Warung (Owner)';
  const userEmail = settings.userEmail || 'owner@seblak48.id';
  const userStatus: UserAccountStatus = settings.userStatus || 'Online';
  const statusInfo = STATUS_CONFIG[userStatus] || STATUS_CONFIG.Online;

  const navItems = [
    { id: 'beranda', label: 'Ringkasan', icon: LayoutDashboard },
    {
      id: 'stok',
      label: 'Stok Bahan',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'riwayat', label: 'Riwayat Transaksi', icon: ReceiptText },
    { id: 'laporan', label: 'Laporan Omset', icon: BarChart3 },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 p-4 justify-between h-screen sticky top-0">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-600/30 shrink-0">
              <Flame className="w-7 h-7 fill-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-base leading-tight text-stone-900 dark:text-stone-100 tracking-tight truncate">
                {settings.storeName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Warung Operasional
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bagian Kiri Bawah: Mode Gelap & Kartu Informasi Akun User */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-stone-500">Mode Gelap:</span>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              title="Ganti Mode Tampilan"
            >
              {settings.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Kartu Akun User di Kiri Bawah Sidebar */}
          <div
            onClick={() => setIsAccountModalOpen(true)}
            className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200/80 dark:border-stone-800 hover:border-orange-500/60 dark:hover:border-orange-500/60 transition cursor-pointer group"
            title="Klik untuk melihat & mengatur profil akun"
          >
            <div className="flex items-center gap-2.5">
              {/* Icon / Avatar Akun dengan Titik Status */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-xs">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-900 ${statusInfo.dotClass}`}
                />
              </div>

              {/* Nama User, Role & Status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-extrabold text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                    {userName}
                  </p>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition shrink-0" />
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span className="truncate">{userRole}</span>
                </p>
              </div>
            </div>

            {/* Baris Status Akun & Email */}
            <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.label}
              </span>
              <span className="text-[10px] text-stone-400 truncate">{userEmail}</span>
            </div>
          </div>

          {/* Tombol Logout di Kiri Bawah Sidebar Desktop */}
          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-900/60 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Akun</span>
          </button>
        </div>
      </aside>

      {isAccountModalOpen && (
        <AccountProfileModal
          settings={settings}
          onClose={() => setIsAccountModalOpen(false)}
          onUpdateSettings={onUpdateSettings}
          onRequestLogout={() => {
            setIsAccountModalOpen(false);
            setIsLogoutConfirmOpen(true);
          }}
        />
      )}

      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          userName={userName}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={() => {
            setIsLogoutConfirmOpen(false);
            if (onLogout) onLogout();
          }}
        />
      )}
    </>
  );
};

export const MobileNavigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  settings,
  onToggleTheme,
  onUpdateSettings,
  onLogout,
  lowStockCount,
}) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const userName = settings.userName || 'Nabil Rachman';
  const userStatus: UserAccountStatus = settings.userStatus || 'Online';
  const statusInfo = STATUS_CONFIG[userStatus] || STATUS_CONFIG.Online;

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand Kiri */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
              {settings.storeName}
            </h1>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 -mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operasional
            </span>
          </div>
        </div>

        {/* Kanan: Icon Akun User Saja + Tombol Tema */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="relative p-2 rounded-xl bg-linear-to-br from-orange-500 to-red-600 text-white shadow-xs hover:opacity-95 transition cursor-pointer"
            title="Profil & Status Akun"
            aria-label="Profil & Status Akun"
          >
            <User className="w-4 h-4 stroke-[2.2]" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-stone-900 ${statusInfo.dotClass}`}
            />
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
            title="Ganti Mode Tampilan"
          >
            {settings.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1.5 flex items-center justify-around">
        {/* 1. Beranda */}
        <button
          onClick={() => onTabChange('beranda')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'beranda'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Beranda</span>
        </button>

        {/* 2. Riwayat */}
        <button
          onClick={() => onTabChange('riwayat')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'riwayat'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5" />
          <span>Riwayat</span>
        </button>

        {/* 3. Stok (Di Tengah dengan Highlight Background) */}
        <button
          onClick={() => onTabChange('stok')}
          className={`relative -mt-4 flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-[10px] font-extrabold transition shadow-lg cursor-pointer ${
            activeTab === 'stok'
              ? 'bg-linear-to-tr from-orange-600 to-amber-500 text-white shadow-orange-600/35 ring-2 ring-white dark:ring-stone-900'
              : 'bg-linear-to-tr from-orange-500 to-amber-500 text-white/95 shadow-orange-500/25 hover:from-orange-600 hover:to-amber-500 ring-2 ring-white dark:ring-stone-900'
          }`}
        >
          <Boxes className="w-5 h-5 mb-0.5 stroke-[2.3]" />
          <span>Stok</span>
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-xs">
              {lowStockCount}
            </span>
          )}
        </button>

        {/* 4. Laporan */}
        <button
          onClick={() => onTabChange('laporan')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'laporan'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Laporan</span>
        </button>

        {/* 5. Atur */}
        <button
          onClick={() => onTabChange('pengaturan')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'pengaturan'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Atur</span>
        </button>
      </div>

      {isAccountModalOpen && (
        <AccountProfileModal
          settings={settings}
          onClose={() => setIsAccountModalOpen(false)}
          onUpdateSettings={onUpdateSettings}
          onRequestLogout={() => {
            setIsAccountModalOpen(false);
            setIsLogoutConfirmOpen(true);
          }}
        />
      )}

      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          userName={userName}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={() => {
            setIsLogoutConfirmOpen(false);
            if (onLogout) onLogout();
          }}
        />
      )}
    </>
  );
};

interface AccountProfileModalProps {
  settings: StoreSettings;
  onClose: () => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
  onRequestLogout?: () => void;
}

const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  settings,
  onClose,
  onUpdateSettings,
  onRequestLogout,
}) => {
  const [userName, setUserName] = useState(settings.userName || 'Nabil Rachman');
  const [userRole, setUserRole] = useState(settings.userRole || 'Pemilik Warung (Owner)');
  const [userEmail, setUserEmail] = useState(settings.userEmail || 'owner@seblak48.id');
  const [userStatus, setUserStatus] = useState<UserAccountStatus>(
    settings.userStatus || 'Online'
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusSelect = (newStatus: UserAccountStatus) => {
    setUserStatus(newStatus);
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        userName: userName.trim() || 'Nabil Rachman',
        userRole: userRole.trim() || 'Pemilik Warung (Owner)',
        userEmail: userEmail.trim() || 'owner@seblak48.id',
        userStatus: newStatus,
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        userName: userName.trim() || 'Nabil Rachman',
        userRole: userRole.trim() || 'Pemilik Warung (Owner)',
        userEmail: userEmail.trim() || 'owner@seblak48.id',
        userStatus,
      });
    }
    setIsEditing(false);
  };

  const currentStatusInfo = STATUS_CONFIG[userStatus] || STATUS_CONFIG.Online;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Banner Akun */}
        <div className="bg-linear-to-r from-orange-600 via-amber-600 to-red-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white text-orange-600 flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${currentStatusInfo.dotClass}`}
              />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Akun Pengelola
              </span>
              <h3 className="text-lg font-black leading-tight mt-1 truncate">{userName}</h3>
              <p className="text-xs text-orange-100 truncate">{userRole}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Pilihan Status Akun */}
          <div>
            <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-2">
              Status Akun Saat Ini:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Online', 'Sibuk', 'Istirahat'] as UserAccountStatus[]).map((st) => {
                const cfg = STATUS_CONFIG[st];
                const isSelected = userStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusSelect(st)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? `${cfg.badgeClass} ring-2 ring-orange-500/40`
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">{currentStatusInfo.desc}</p>
          </div>

          {/* Detail atau Form Edit Profil Akun */}
          {!isEditing ? (
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-semibold">Nama Pengguna:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-semibold">Peran / Jabatan:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{userRole}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email:
                </span>
                <span className="font-bold text-stone-700 dark:text-stone-300">{userEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-semibold">Cabang Warung:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {settings.storeName}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Nama User
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Jabatan / Role
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Akun
                </button>
              </div>
            </form>
          )}

          {/* Footer Modal */}
          {!isEditing && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah Info</span>
                </button>
                {onRequestLogout && (
                  <button
                    type="button"
                    onClick={onRequestLogout}
                    className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-900/60 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LogoutConfirmModalProps {
  userName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  userName,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
              Konfirmasi Logout
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Keluar dari sesi akun <strong>{userName}</strong>?
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          Seluruh data stok bahan, riwayat transaksi, dan pengaturan warung tetap tersimpan dengan aman.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ya, Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
