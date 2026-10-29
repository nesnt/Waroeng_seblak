import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
} from '../types';
import {
  getStoredUsers,
  createNewAccount,
  deleteAccount,
  syncUsersWithSupabase,
  validatePasswordStrength,
} from '../services/accountService';
import {
  X,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  AlertCircle,
  Users,
  Lock,
  Mail,
  User,
} from 'lucide-react';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: (newUser: UserAccount) => void;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    const local = getStoredUsers();
    setUsers(local);
    // Asynchronous background sync with Supabase
    const synced = await syncUsersWithSupabase();
    setUsers(synced);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validasi kata sandi: minimal 8 karakter, 1 huruf kapital, 1 simbol
    const pwdValidation = validatePasswordStrength(password);
    if (!pwdValidation.isValid) {
      setErrorMsg(`Kata sandi belum memenuhi syarat: harus memiliki ${pwdValidation.errors.join(', ')}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createNewAccount({
        fullName,
        username,
        password,
        role,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menambahkan akun.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(
        `Akun ${role === 'ADMIN' ? 'Admin' : 'Kasir'} "${res.user?.username}" berhasil didaftarkan!`
      );
      setFullName('');
      setUsername('');
      setPassword('');
      loadUsers();

      if (res.user && onAccountCreated) {
        onAccountCreated(res.user);
      }

      // Switch to list after 1.5s or keep on create
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const res = await deleteAccount(deleteTarget.id);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menghapus akun.');
    } else {
      setSuccessMsg(`Akun "${deleteTarget.username}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadUsers();
    }
    setDeleteTarget(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="bg-linear-to-r from-orange-600 via-amber-600 to-red-600 p-5 text-white flex items-start justify-between relative">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider backdrop-blur-xs">
              <KeyRound className="w-3 h-3" />
              Portal Rahasia Akses Pengguna
            </span>
            <h3 className="text-lg sm:text-xl font-black">
              Tambah &amp; Kelola Akun Pengguna
            </h3>
            <p className="text-xs text-orange-100 max-w-md">
              Buat akun baru untuk hak akses Administrator (Admin) atau Kasir Waroeng Seblak 48.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-5 pt-3 gap-2 bg-stone-50 dark:bg-stone-950/60">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'create'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Tambah Akun Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'list'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Daftar Akun Terdaftar ({users.length})
          </button>
        </div>

        {/* Alert Feedback */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-bold animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Pilihan Role / Peran */}
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Tipe Hak Akses Akun:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                      role === 'ADMIN'
                        ? 'border-orange-600 bg-orange-50/80 dark:bg-orange-950/30 text-stone-900 dark:text-stone-100 ring-2 ring-orange-500/30'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-xs text-orange-600 dark:text-orange-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Akses Admin</span>
                      </div>
                      {role === 'ADMIN' && (
                        <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      Dapat login ke Admin Panel, memantau stok bahan, riwayat, dan laporan keuangan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('KASIR')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                      role === 'KASIR'
                        ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/30 text-stone-900 dark:text-stone-100 ring-2 ring-emerald-500/30'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-xs text-emerald-600 dark:text-emerald-400">
                        <UserCheck className="w-4 h-4" />
                        <span>Akses Kasir</span>
                      </div>
                      {role === 'KASIR' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      Dapat login ke aplikasi Kasir, mencatat pesanan mangkok seblak, dan cetak struk nota.
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Input Data Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Nama Lengkap Pemilik Akun:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Mis: Siti Rahmawati"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Username atau Email Login:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder={role === 'ADMIN' ? 'admin_budi / budi@seblak48.id' : 'kasir2 / sitik@seblak48.id'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Kata Sandi (Password):
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Contoh: Seblak#48 (Min 8 karakter, 1 kapital, 1 simbol)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs py-2.5 pl-9 pr-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title={showPassword ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Indikator Validasi Syarat Kata Sandi */}
                {(() => {
                  const check = validatePasswordStrength(password);
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 space-y-1.5">
                      <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        Syarat Keamanan Kata Sandi:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            check.hasMinLength
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                              check.hasMinLength ? 'opacity-100 stroke-[3]' : 'opacity-25'
                            }`}
                          />
                          <span>Minimal 8 karakter</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            check.hasUppercase
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                              check.hasUppercase ? 'opacity-100 stroke-[3]' : 'opacity-25'
                            }`}
                          />
                          <span>1 Huruf Kapital (A-Z)</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            check.hasSymbol
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                              check.hasSymbol ? 'opacity-100 stroke-[3]' : 'opacity-25'
                            }`}
                          />
                          <span>1 Simbol (!@#$%...)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-stone-500 mt-1.5">
                  Kata sandi ini digunakan staf untuk masuk ke sistem {role === 'ADMIN' ? 'Admin' : 'Kasir'}.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-99 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Menyimpan Akun...'
                      : `Daftarkan Akun ${role === 'ADMIN' ? 'Admin' : 'Kasir'} Baru`}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
                <span>Daftar akun yang berhak login ke sistem:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">
                  Total: {users.length} Akun
                </span>
              </div>

              <div className="space-y-2">
                {users.map((u) => {
                  const isAdmin = u.role === 'ADMIN';
                  const isProtected =
                    u.username === 'admin@seblak48.id' ||
                    u.username === 'admin' ||
                    u.username === 'owner@seblak48.id';

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isAdmin
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          {isAdmin ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-900 dark:text-stone-100 truncate">
                              {u.fullName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isAdmin
                                  ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <div className="text-stone-500 flex items-center gap-2 text-[11px] truncate mt-0.5">
                            <span>Username: <strong className="text-stone-700 dark:text-stone-300">{u.username}</strong></span>
                            <span>•</span>
                            <span>Sandi: <code className="bg-stone-200 dark:bg-stone-700 px-1 rounded">{u.password}</code></span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isProtected ? (
                          <span className="text-[10px] text-stone-400 font-semibold italic px-2 py-1">
                            Akun Utama
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                            title="Hapus Akun Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Konfirmasi Hapus Akun */}
        {deleteTarget && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  Hapus Akun Pengguna?
                </h4>
                <p className="text-xs text-stone-500">
                  Akun <strong>{deleteTarget.username}</strong> ({deleteTarget.fullName}) tidak akan dapat login lagi ke sistem.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

