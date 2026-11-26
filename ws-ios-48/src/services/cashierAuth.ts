import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type StaffRole = 'KASIR' | 'ADMIN';

export interface VerifiedStaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
}

export function normalizeStaffEmail(input: string): string {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@seblak48.id`;
}

async function resolveStaffRole(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}): Promise<{ role: StaffRole | null; fullName: string }> {
  let resolvedRole: StaffRole | null = null;
  let fullName: string =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.email?.split('@')[0] ||
    'Petugas Kasir';

  try {
    let { data: dbUser } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!dbUser && authUser.email) {
      const emailLower = authUser.email.toLowerCase();
      const byEmail = await supabase
        .from('users')
        .select('role, full_name')
        .ilike('username', emailLower)
        .maybeSingle();
      dbUser = byEmail.data;

      if (!dbUser && emailLower.endsWith('@seblak48.id')) {
        const shortName = emailLower.split('@')[0];
        const byShort = await supabase
          .from('users')
          .select('role, full_name')
          .ilike('username', shortName)
          .maybeSingle();
        dbUser = byShort.data;
      }
    }

    if (dbUser) {
      if (dbUser.role === 'KASIR' || dbUser.role === 'ADMIN') {
        resolvedRole = dbUser.role;
      }
      if (dbUser.full_name) {
        fullName = dbUser.full_name;
      }
    }
  } catch {
    // Lanjut cek metadata eksplisit bila tabel public.users belum termigrasi
  }

  if (!resolvedRole) {
    const metaRole = String(authUser.user_metadata?.role || '').toUpperCase();
    if (metaRole === 'KASIR' || metaRole === 'ADMIN') {
      resolvedRole = metaRole as StaffRole;
    }
  }

  return { role: resolvedRole, fullName };
}

/**
 * Verifikasi login untuk Portal Kasir (/kasir) menggunakan Supabase Auth resmi.
 * Mengizinkan staf ber-role KASIR maupun ADMIN, tanpa hardcoded password di bundle publik.
 */
export async function verifyCashierLogin(
  emailOrUsername: string,
  passwordInput: string
): Promise<{ success: boolean; user?: VerifiedStaffUser; error?: string }> {
  const cleanUser = emailOrUsername.trim();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Email/ID Kasir dan kata sandi wajib diisi.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error:
        'Koneksi autentikasi server (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) belum dikonfigurasi.',
    };
  }

  const emailToAuth = normalizeStaffEmail(cleanUser);

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
            'Email akun kasir belum dikonfirmasi di Supabase Dashboard -> Authentication -> Users.',
        };
      }
      return {
        success: false,
        error: 'Email atau kata sandi kasir tidak valid.',
      };
    }

    const { role, fullName } = await resolveStaffRole(data.user);
    if (role !== 'KASIR' && role !== 'ADMIN') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Akun ini tidak memiliki otorisasi sebagai petugas Kasir maupun Admin.',
      };
    }

    sessionStorage.setItem('seblak48_cashier_session', 'true');
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || emailToAuth,
        fullName,
        role,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Gagal terhubung ke server autentikasi. Periksa jaringan internet Anda.',
    };
  }
}

/**
 * Validasi sesi JWT aktif Supabase Auth untuk akses rute /kasir (mencegah bypass sessionStorage)
 */
export async function checkCashierSession(): Promise<{
  isAuthenticated: boolean;
  user?: VerifiedStaffUser;
}> {
  if (!isSupabaseConfigured()) {
    sessionStorage.removeItem('seblak48_cashier_session');
    return { isAuthenticated: false };
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      sessionStorage.removeItem('seblak48_cashier_session');
      return { isAuthenticated: false };
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const verifiedUser = userData?.user || session.user;
    if (userErr || !verifiedUser) {
      sessionStorage.removeItem('seblak48_cashier_session');
      return { isAuthenticated: false };
    }

    const { role, fullName } = await resolveStaffRole(verifiedUser);
    if (role !== 'KASIR' && role !== 'ADMIN') {
      await supabase.auth.signOut();
      sessionStorage.removeItem('seblak48_cashier_session');
      return { isAuthenticated: false };
    }

    sessionStorage.setItem('seblak48_cashier_session', 'true');
    return {
      isAuthenticated: true,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email || '',
        fullName,
        role,
      },
    };
  } catch {
    sessionStorage.removeItem('seblak48_cashier_session');
    return { isAuthenticated: false };
  }
}

export async function logoutCashier(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network signout failure
    }
  }
  sessionStorage.removeItem('seblak48_cashier_session');
}
