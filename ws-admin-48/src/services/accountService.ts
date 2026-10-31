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
 * Akun default lokal (tanpa menyimpan plain text password di localStorage demi keamanan)
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
  {
    id: 'user-default-admin-2',
    username: 'admin',
    fullName: 'Admin Pengelola',
    role: 'ADMIN',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-default-kasir-1',
    username: 'kasir1',
    fullName: 'Siti Rahmawati',
    role: 'KASIR',
    status: 'Online',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-kasir-nabil',
    username: 'nabil@gmail.com',
    fullName: 'Nabil',
    role: 'KASIR',
    status: 'Online',
    createdAt: '2026-10-31T00:00:00.000Z',
  },
];

/**
 * Mengambil daftar akun pengguna dari localStorage (profil akun tanpa password mentah)
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
    // Hapus properti password jika pernah tersimpan di cache lama
    return parsed.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
  } catch (err) {
    console.error('Gagal membaca data akun pengguna:', err);
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
 * Sinkronisasi akun dengan Supabase
 */
export async function syncUsersWithSupabase(): Promise<UserAccount[]> {
  const localUsers = getStoredUsers();
  if (!isSupabaseConfigured()) return localUsers;

  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.warn('⚠️ [Supabase] Info: Tabel users belum ada atau query select error:', error.message);
      return localUsers;
    }

    if (data && data.length > 0) {
      const merged: UserAccount[] = [...localUsers];
      for (const row of data) {
        const exists = merged.find(
          (u) => u.username.toLowerCase() === row.username.toLowerCase() || u.id === row.id
        );
        if (!exists) {
          merged.push({
            id: row.id,
            username: row.username,
            fullName: row.full_name,
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
 * Verifikasi login untuk Admin Panel menggunakan Supabase Auth (atau fallback offline)
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

  // JIKA SUPABASE TERHUBUNG: Gunakan Supabase Auth Resmi (Bcrypt Hash di Cloud Server)
  if (isSupabaseConfigured()) {
    const emailToAuth = normalizeAuthEmail(cleanUser);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: cleanPass,
      });

      if (error) {
        // Fallback Darurat: Jika pengguna memasukkan kredensial admin bawaan, izinkan masuk agar tidak terkunci
        const isEmergencyAdmin =
          (cleanUser.toLowerCase() === 'admin@seblak48.id' ||
            cleanUser.toLowerCase() === 'admin' ||
            cleanUser.toLowerCase() === 'owner@seblak48.id') &&
          (cleanPass === 'seblak48admin' || cleanPass === 'seblak48');

        if (isEmergencyAdmin) {
          console.warn('⚠️ [Auth] Menggunakan mode darurat lokal karena akun Supabase belum aktif/dikonfirmasi.');
          return {
            success: true,
            user: {
              id: 'user-default-admin',
              username: cleanUser,
              fullName: 'Administrator (Mode Darurat)',
              role: 'ADMIN',
              status: 'Online',
              createdAt: new Date().toISOString(),
            },
          };
        }

        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_grant')
        ) {
          return {
            success: false,
            error:
              'Kredensial belum aktif atau belum dikonfirmasi di Supabase. Anda dapat menggunakan akun darurat (admin@seblak48.id / seblak48admin) atau klik "Confirm user" di Supabase Dashboard -> Auth -> Users.',
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error:
              'Email akun belum dikonfirmasi di Supabase. Silakan buka Supabase Dashboard -> Auth -> Users untuk mengonfirmasi (klik titik tiga ... -> Confirm user).',
          };
        }
        return {
          success: false,
          error: `Gagal autentikasi Supabase: ${error.message}`,
        };
      }

      if (data?.user) {
        let userRole: UserRole =
          (data.user.user_metadata?.role as UserRole) || 'ADMIN';
        let fullName: string =
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Administrator';

        // Sinkronisasi data detail dari tabel public.users jika ada
        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (dbUser) {
            userRole = (dbUser.role as UserRole) || userRole;
            fullName = dbUser.full_name || fullName;
          }
        } catch (_) {}

        if (userRole !== 'ADMIN') {
          await supabase.auth.signOut();
          return {
            success: false,
            error: `Akun "${data.user.email}" memiliki hak akses KASIR. Portal ini khusus untuk ADMIN.`,
          };
        }

        const authenticatedUser: UserAccount = {
          id: data.user.id,
          username: data.user.email || cleanUser,
          fullName,
          role: userRole,
          status: 'Online',
          createdAt: data.user.created_at,
        };

        // Simpan profile ke daftar user lokal
        const localList = getStoredUsers();
        if (!localList.some((u) => u.id === authenticatedUser.id)) {
          saveStoredUsers([...localList, authenticatedUser]);
        }

        return {
          success: true,
          user: authenticatedUser,
        };
      }
    } catch (err: any) {
      console.error('Error saat menghubungi Supabase Auth:', err);
      return {
        success: false,
        error: `Koneksi ke Supabase Auth gagal: ${err?.message || err}`,
      };
    }
  }

  // JIKA OFFLINE (Kredensial belum dipasang di .env): Mode Demo Lokal Terbatas
  const isHardcodedAdmin =
    (cleanUser.toLowerCase() === 'admin@seblak48.id' ||
      cleanUser.toLowerCase() === 'admin' ||
      cleanUser.toLowerCase() === 'owner@seblak48.id') &&
    (cleanPass === 'seblak48admin' || cleanPass === 'seblak48');

  if (isHardcodedAdmin) {
    return {
      success: true,
      user: {
        id: 'user-default-admin',
        username: cleanUser,
        fullName: 'Administrator (Offline Fallback)',
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

/**
 * Periksa apakah ada sesi aktif di Supabase Auth (untuk auto-login saat refresh)
 */
export async function checkAdminSession(): Promise<{
  isAuthenticated: boolean;
  user?: UserAccount;
}> {
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let userRole: UserRole =
          (session.user.user_metadata?.role as UserRole) || 'ADMIN';
        let fullName: string =
          session.user.user_metadata?.full_name ||
          session.user.email?.split('@')[0] ||
          'Administrator';

        try {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (dbUser) {
            userRole = (dbUser.role as UserRole) || userRole;
            fullName = dbUser.full_name || fullName;
          }
        } catch (_) {}

        if (userRole === 'ADMIN') {
          return {
            isAuthenticated: true,
            user: {
              id: session.user.id,
              username: session.user.email || 'admin',
              fullName,
              role: userRole,
              status: 'Online',
              createdAt: session.user.created_at,
            },
          };
        }
      }
    } catch (err) {
      console.warn('Gagal memverifikasi sesi Supabase:', err);
    }
  }

  // Fallback sessionStorage
  const isLocalSession = sessionStorage.getItem('seblak48_admin_session') === 'true';
  return { isAuthenticated: isLocalSession };
}

/**
 * Logout admin dari Supabase Auth dan bersihkan sesi browser
 */
export async function logoutAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Gagal sign out dari Supabase:', err);
    }
  }
  sessionStorage.removeItem('seblak48_admin_session');
}

