import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper pembersih string env (menghilangkan petik ganda/tunggal, spasi, dan titik koma)
const cleanEnvVar = (val: any): string => {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim();
  s = s.replace(/^["'`]|["'`]$/g, '').trim();
  s = s.replace(/;+$/, '').trim();
  return s;
};

// Deteksi otomatis URL Supabase
const findUrlFromEnv = (): string => {
  const envObj = import.meta.env as Record<string, any>;
  const standardNames = [
    'VITE_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
  ];
  for (const name of standardNames) {
    if (envObj[name]) return envObj[name];
  }
  for (const [, v] of Object.entries(envObj)) {
    if (
      typeof v === 'string' &&
      (v.includes('supabase.co') || v.includes(':54321'))
    ) {
      return v;
    }
  }
  return '';
};

// Deteksi otomatis Anon Key Supabase (toleran terhadap variasi nama variabel)
const findKeyFromEnv = (): string => {
  const envObj = import.meta.env as Record<string, any>;
  const standardNames = [
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_KEY',
    'VITE_SUPABASE_PUBLIC_KEY',
    'VITE_SUPABASE_API_KEY',
    'VITE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_KEY',
    'SUPABASE_PUBLIC_KEY',
    'SUPABASE_API_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_KEY',
    'ANON_KEY',
  ];
  for (const name of standardNames) {
    if (envObj[name]) return envObj[name];
  }
  // Toleransi pencocokan nama key jika ada typo tapi nilainya panjang (> 25 karakter)
  for (const [k, v] of Object.entries(envObj)) {
    if (
      typeof v === 'string' &&
      v.length > 25 &&
      (k.toUpperCase().includes('KEY') || k.toUpperCase().includes('ANON') || k.toUpperCase().includes('SUPA'))
    ) {
      return v;
    }
  }
  return '';
};

let cleanedUrl = cleanEnvVar(findUrlFromEnv());
if (cleanedUrl && !cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
  cleanedUrl = `https://${cleanedUrl}`;
}
const cleanedKey = cleanEnvVar(findKeyFromEnv());

export const supabaseUrl = cleanedUrl;
export const supabaseAnonKey = cleanedKey;

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
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
    supabaseAnonKey.length > 20
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

  const detectedVarNames = Object.keys(import.meta.env).filter(
    (k) => k.startsWith('VITE_') || k.includes('SUPABASE') || k.includes('ANON')
  );

  console.info('🔍 [Supabase Config Diagnostics]:', {
    hasUrl: Boolean(supabaseUrl),
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : '(kosong)',
    hasKey: Boolean(supabaseAnonKey),
    keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
    variabelYangTerbacaOlehVite: detectedVarNames,
  });
}
