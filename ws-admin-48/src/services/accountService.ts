import { UserAccount, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const USERS_STORAGE_KEY = 'seblak48_users';

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-default-admin-1',
    username: 'admin@seblak48.id',
    fullName: 'Administrator',
    password: 'seblak48admin',
    role: 'ADMIN',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-default-admin-2',
    username: 'admin',
    fullName: 'Admin Pengelola',
    password: 'seblak48',
    role: 'ADMIN',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-default-admin-3',
    username: 'owner@seblak48.id',
    fullName: 'Owner Waroeng',
    password: 'seblak48admin',
    role: 'ADMIN',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-default-kasir-1',
    username: 'kasir1',
    fullName: 'Siti Rahmawati',
    password: 'kasir123',
    role: 'KASIR',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-default-kasir-2',
    username: 'kasir@seblak48.id',
    fullName: 'Kasir Utama',
    password: 'kasir48',
    role: 'KASIR',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Mengambil seluruh daftar akun pengguna dari localStorage
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    return parsed;
  } catch (err) {
    console.error('Gagal membaca data akun pengguna:', err);
    return DEFAULT_ACCOUNTS;
  }
}

/**
 * Simpan daftar akun ke localStorage
 */
export function saveStoredUsers(users: UserAccount[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

/**
 * Sinkronisasi akun dengan Supabase (jika terkonfigurasi)
 */
export async function syncUsersWithSupabase(): Promise<UserAccount[]> {
  const localUsers = getStoredUsers();
  if (!isSupabaseConfigured()) return localUsers;

  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.warn('⚠️ [Supabase] Gagal mengambil daftar pengguna:', error);
      return localUsers;
    }

    if (data && data.length > 0) {
      const merged: UserAccount[] = [...localUsers];
      for (const row of data) {
        const exists = merged.find(
          (u) => u.username.toLowerCase() === row.username.toLowerCase()
        );
        if (!exists) {
          merged.push({
            id: row.id,
            username: row.username,
            fullName: row.full_name,
            password: row.password_hash,
            role: row.role as UserRole,
            status: row.account_status,
            createdAt: row.created_at || new Date().toISOString(),
          });
        }
      }
      saveStoredUsers(merged);
      return merged;
    }
    return localUsers;
  } catch (e) {
    console.warn('⚠️ [Supabase] Error sync users:', e);
    return localUsers;
  }
}

/**
 * Validasi kekuatan kata sandi:
 * - Minimal 8 karakter
 * - Minimal 1 huruf kapital (A-Z)
 * - Minimal 1 simbol / karakter khusus
 */
export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasSymbol: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const p = (password || '').trim();
  const hasMinLength = p.length >= 8;
  const hasUppercase = /[A-Z]/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);

  const errors: string[] = [];
  if (!hasMinLength) {
    errors.push('minimal 8 karakter');
  }
  if (!hasUppercase) {
    errors.push('minimal 1 huruf kapital');
  }
  if (!hasSymbol) {
    errors.push('minimal 1 simbol');
  }

  return {
    isValid: hasMinLength && hasUppercase && hasSymbol,
    hasMinLength,
    hasUppercase,
    hasSymbol,
    errors,
  };
}

/**
 * Tambah akun baru (Admin atau Kasir)
 */
export async function createNewAccount(payload: {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUsername = payload.username.trim().toLowerCase();
  const cleanFullName = payload.fullName.trim();
  const cleanPassword = payload.password.trim();

  if (!cleanUsername) {
    return { success: false, error: 'Username atau email wajib diisi.' };
  }
  if (!cleanFullName) {
    return { success: false, error: 'Nama pengguna wajib diisi.' };
  }

  // Validasi password: min 8 karakter, 1 huruf kapital, 1 simbol
  const pwdValidation = validatePasswordStrength(cleanPassword);
  if (!pwdValidation.isValid) {
    return {
      success: false,
      error: `Kata sandi harus memiliki ${pwdValidation.errors.join(', ')}.`,
    };
  }

  const currentUsers = getStoredUsers();
  const duplicate = currentUsers.find(
    (u) => u.username.toLowerCase() === cleanUsername
  );
  if (duplicate) {
    return {
      success: false,
      error: `Username atau email "${cleanUsername}" sudah digunakan oleh akun lain.`,
    };
  }

  const newUser: UserAccount = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    fullName: cleanFullName,
    password: cleanPassword,
    role: payload.role,
    status: 'Online',
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...currentUsers, newUser];
  saveStoredUsers(updatedUsers);

  // Jika Supabase aktif, simpan juga ke database Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('users').insert({
        username: newUser.username,
        full_name: newUser.fullName,
        password_hash: newUser.password,
        role: newUser.role,
        account_status: 'Online',
      });
    } catch (e) {
      console.warn('⚠️ [Supabase] Gagal menyimpan user ke Supabase:', e);
    }
  }

  return { success: true, user: newUser };
}

/**
 * Hapus akun pengguna (menolak penghapusan akun superadmin bawaan)
 */
export async function deleteAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUsers = getStoredUsers();
  const target = currentUsers.find((u) => u.id === userId);

  if (!target) {
    return { success: false, error: 'Akun tidak ditemukan.' };
  }

  // Lindungi akun default penting
  if (
    target.username === 'admin@seblak48.id' ||
    target.username === 'admin' ||
    target.username === 'owner@seblak48.id'
  ) {
    return {
      success: false,
      error: 'Akun Administrator utama dilindungi dan tidak dapat dihapus.',
    };
  }

  const filtered = currentUsers.filter((u) => u.id !== userId);
  saveStoredUsers(filtered);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('users').delete().eq('username', target.username);
    } catch (e) {
      console.warn('⚠️ [Supabase] Gagal menghapus user dari Supabase:', e);
    }
  }

  return { success: true };
}

/**
 * Verifikasi login untuk Admin Panel
 */
export function verifyAdminLogin(
  usernameOrEmail: string,
  passInput: string
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanUser = usernameOrEmail.trim().toLowerCase();
  const cleanPass = passInput.trim();

  const allUsers = getStoredUsers();
  const found = allUsers.find(
    (u) => u.username.toLowerCase() === cleanUser
  );

  // Jika username ditemukan
  if (found) {
    if (found.role !== 'ADMIN') {
      return {
        success: false,
        error: `Akun "${found.username}" terdaftar sebagai KASIR. Halaman ini khusus untuk portal ADMIN.`,
      };
    }
    if (found.password === cleanPass) {
      return { success: true, user: found };
    }
    return {
      success: false,
      error: 'Kata sandi pengelola salah! Silakan periksa kembali.',
    };
  }

  // Fallback kredensial bawaan darurat
  const isHardcodedAdmin =
    (cleanUser === 'admin@seblak48.id' ||
      cleanUser === 'admin' ||
      cleanUser === 'owner@seblak48.id') &&
    (cleanPass === 'seblak48admin' || cleanPass === 'seblak48');

  if (isHardcodedAdmin) {
    return {
      success: true,
      user: {
        id: 'user-default-admin',
        username: cleanUser,
        fullName: 'Administrator',
        password: cleanPass,
        role: 'ADMIN',
        status: 'Online',
        createdAt: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    error: 'Email atau kata sandi pengelola salah!',
  };
}

