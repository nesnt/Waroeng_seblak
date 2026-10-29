import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper pembersih string env (menghilangkan petik ganda/tunggal dan spasi tidak sengaja)
const cleanEnvVar = (val: any): string => {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = cleanEnvVar(rawUrl);
const supabaseAnonKey = cleanEnvVar(rawKey);

/**
 * Cek apakah kredensial Supabase sudah terkonfigurasi dengan benar di file .env
 */
export const isSupabaseConfigured = (): boolean => {
  const isDummyPlaceholder =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('your-project') ||
    supabaseAnonKey.includes('your-anon') ||
    supabaseAnonKey === 'placeholder-anon-key';

  return Boolean(
    !isDummyPlaceholder &&
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
  );
};

// Buat client Supabase (jika belum dikonfigurasi, gunakan dummy fallback agar inisialisasi tidak throw error)
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-seblak48.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key'
);

if (isSupabaseConfigured()) {
  console.info('🔌 [Supabase] Terhubung ke cloud backend:', supabaseUrl);
} else {
  console.warn(
    '⚠️ [Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum dikonfigurasi di .env.\n' +
    'Aplikasi akan berjalan dalam mode offline / local fallback hingga kredensial diisi.'
  );
  if (import.meta.env.DEV) {
    console.debug('🔍 [Supabase Config Check]:', {
      hasUrl: Boolean(supabaseUrl),
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : '(kosong)',
      hasKey: Boolean(supabaseAnonKey),
      keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
    });
  }
}
