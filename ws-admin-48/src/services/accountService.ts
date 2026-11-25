import { UserAccount, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const USERS_STORAGE_KEY = 'seblak48_users';

/**
 * Normalisasi email untuk Supabase Auth (jika user hanya mengetik 'admin', ubah ke 'admin@seblak48.id')
 */
export function normalizeAuthEmail(input: string): string {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@seblak48.id`;
}

/**
 * Akun default lokal (hanya metadata profil tanpa password)
 */
export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-default-admin-1',
    username: 'admin@seblak48.id',
    fullName: 'Administrator',
    role: 'ADMIN',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Mengambil daftar akun pengguna dari localStorage (profil akun tanpa password mentah)
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_ACCOUNTS;
    }
    return parsed.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

/**
 * Simpan daftar akun ke localStorage (selalu buang password mentah sebelum save)
 */
export function saveStoredUsers(users: UserAccount[]): void {
  const sanitized = users.map((u) => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(sanitized));
}

/**
 * Resolusi role pengguna dengan prinsip Least Privilege (Deny-by-default untuk non-ADMIN).
 * Prioritas utama dari tabel public.users, fallback ke user_metadata jika eksplisit ADMIN.
 */
async function resolveVerifiedUserRole(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}): Promise<{ role: UserRole | null; fullName: string; status?: 'Online' | 'Sibuk' | 'Istirahat' }> {
  let resolvedRole: UserRole | null = null;
  let resolvedStatus: 'Online' | 'Sibuk' | 'Istirahat' | undefined;
  let fullName: string =
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'Pengelola';

  try {
    // 1. Cek berdasarkan UUID authUser.id
    let { data: dbUser } = await supabase
      .from('users')
      .select('role, full_name, account_status')
      .eq('id', authUser.id)
      .maybeSingle();

    // 2. Fallback: jika tabel public.users di-seed dengan UUID berbeda, cocokkan berdasarkan email / username
    if (!dbUser && authUser.email) {
      const emailLower = authUser.email.toLowerCase();
      const byEmail = await supabase
        .from('users')
        .select('role, full_name, account_status')
        .ilike('username', emailLower)
        .maybeSingle();
      dbUser = byEmail.data;

      if (!dbUser && emailLower.endsWith('@seblak48.id')) {
        const shortUser = emailLower.split('@')[0];
        const byShort = await supabase
          .from('users')
          .select('role, full_name, account_status')
          .ilike('username', shortUser)
          .maybeSingle();
        dbUser = byShort.data;
      }
    }

    if (dbUser) {
      if (dbUser.role === 'ADMIN' || dbUser.role === 'KASIR') {
        resolvedRole = dbUser.role;
      }
      if (dbUser.full_name) {
        fullName = dbUser.full_name;
      }
      if (
        dbUser.account_status === 'Online' ||
        dbUser.account_status === 'Sibuk' ||
        dbUser.account_status === 'Istirahat'
      ) {
        resolvedStatus = dbUser.account_status;
      }
    }
  } catch {
    // Lanjut cek metadata eksplisit
  }

  // Fallback ke metadata HANYA jika belum ditemukan di public.users dan bernilai eksplisit
  if (!resolvedRole) {
    const metaRole = String(authUser.user_metadata?.role || '').toUpperCase();
    if (metaRole === 'ADMIN' || metaRole === 'KASIR') {
      resolvedRole = metaRole as UserRole;
    }
  }

  return { role: resolvedRole, fullName, status: resolvedStatus };
}

/**
 * Verifikasi login untuk Admin Panel menggunakan Supabase Auth Resmi.
 * Tanpa hardcoded password backdoor pada environment cloud/production.
 */
export async function verifyAdminLogin(
  usernameOrEmail: string,
  passInput: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUser = usernameOrEmail.trim();
  const cleanPass = passInput.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Email dan kata sandi wajib diisi.' };
  }

  // 1. JIKA SUPABASE TERHUBUNG: Wajib autentikasi via Supabase Auth (JWT + Bcrypt)
  if (isSupabaseConfigured()) {
    const emailToAuth = normalizeAuthEmail(cleanUser);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: cleanPass,
      });

      if (error || !data?.user) {
        if (error?.message?.includes('Email not confirmed')) {
          return {
            success: false,
            error:
              'Email akun belum dikonfirmasi. Silakan konfirmasi pengguna melalui Supabase Dashboard -> Authentication -> Users.',
          };
        }
        // Pesan generik yang aman (mencegah User Enumeration & Credential Leak)
        return {
          success: false,
          error: 'Email atau kata sandi pengelola tidak valid.',
        };
      }

      const { role: userRole, fullName } = await resolveVerifiedUserRole(data.user);

      if (userRole !== 'ADMIN') {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Akses ditolak. Akun ini tidak memiliki otorisasi sebagai Administrator.',
        };
      }

      const authenticatedUser: UserAccount = {
        id: data.user.id,
        username: data.user.email || emailToAuth,
        fullName,
        role: 'ADMIN',
        status: 'Online',
        createdAt: data.user.created_at,
      };

      const localList = getStoredUsers();
      if (!localList.some((u) => u.id === authenticatedUser.id)) {
        saveStoredUsers([...localList, authenticatedUser]);
      }

      return {
        success: true,
        user: authenticatedUser,
      };
    } catch {
      return {
        success: false,
        error: 'Gagal terhubung ke layanan autentikasi server. Periksa koneksi internet Anda.',
      };
    }
  }

  // 2. JIKA SUPABASE BELUM DIKONFIGURASI:
  // Di Production Build (Vercel), tolak login sepenuhnya agar tidak ada celah bypass tanpa backend.
  if (!import.meta.env.DEV) {
    return {
      success: false,
      error:
        'Konfigurasi server autentikasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) belum diatur pada environment hosting.',
    };
  }

  return {
    success: false,
    error:
      'Supabase belum terkonfigurasi pada environment lokal. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah diatur.',
  };
}

/**
 * Periksa apakah ada sesi JWT aktif & valid di Supabase Auth (untuk auto-login saat refresh).
 * Tidak pernah mempercayai sessionStorage semata tanpa sesi kriptografis Supabase.
 */
export async function checkAdminSession(): Promise<{
  isAuthenticated: boolean;
  user?: UserAccount;
}> {
  if (!isSupabaseConfigured()) {
    sessionStorage.removeItem('seblak48_admin_session');
    return { isAuthenticated: false };
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      sessionStorage.removeItem('seblak48_admin_session');
      return { isAuthenticated: false };
    }

    // Validasi ulang token ke server Supabase Auth untuk memastikan sesi belum dicabut
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const verifiedUser = userData?.user || session.user;
    if (userErr || !verifiedUser) {
      sessionStorage.removeItem('seblak48_admin_session');
      return { isAuthenticated: false };
    }

    const { role: userRole, fullName } = await resolveVerifiedUserRole(verifiedUser);

    if (userRole !== 'ADMIN') {
      await supabase.auth.signOut();
      sessionStorage.removeItem('seblak48_admin_session');
      return { isAuthenticated: false };
    }

    sessionStorage.setItem('seblak48_admin_session', 'true');
    return {
      isAuthenticated: true,
      user: {
        id: verifiedUser.id,
        username: verifiedUser.email || 'admin',
        fullName,
        role: 'ADMIN',
        status: 'Online',
        createdAt: verifiedUser.created_at,
      },
    };
  } catch {
    sessionStorage.removeItem('seblak48_admin_session');
    return { isAuthenticated: false };
  }
}

/**
 * Logout admin dari Supabase Auth dan bersihkan seluruh jejak sesi lokal
 */
export async function logoutAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Abaikan kegagalan jaringan saat sign out
    }
  }
  sessionStorage.removeItem('seblak48_admin_session');
}
