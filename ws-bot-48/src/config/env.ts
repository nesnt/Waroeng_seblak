import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables dari .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Google Gemini AI
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY wajib diisi di .env'),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),

  // Supabase Backend
  SUPABASE_URL: z.string().url('SUPABASE_URL harus berupa URL Supabase yang valid'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk backend query'),

  // Nomor HP Owner (dipisahkan koma, misal: "628123456789,628987654321")
  OWNER_PHONE_NUMBERS: z.string().default(''),

  // Direktori penyimpanan session auth Baileys
  SESSION_DATA_PATH: z.string().default('./baileys_auth_info'),

  // Konfigurasi Chat Sekali Pakai & Auto-Expiry
  SESSION_TTL_HOURS: z.coerce.number().default(2), // Konteks AI expired dalam 2 jam tidak aktif
  EPHEMERAL_EXPIRATION_SECONDS: z.coerce.number().default(86400), // Pesan sementara WA otomatis hilang (24 jam = 86400)

  // Metadata Warung
  STORE_NAME: z.string().default('Waroeng Seblak 48'),
  STORE_ADDRESS: z.string().default('Jl. Raya Sukaresmi No. 48'),
  STORE_HOURS: z.string().default('Setiap Hari, 10:00 - 22:00 WIB'),
  BROCHURE_URL: z.string().optional()
});

const parseEnv = () => {
  let rawModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  // Jika model lama atau model yang overload digunakan, alihkan ke model stabil gemini-3.1-flash-lite
  if (rawModel.includes('2.5') || rawModel.includes('2.0') || rawModel.includes('3.8') || rawModel.includes('3.7')) {
    rawModel = 'gemini-3.1-flash-lite';
  }

  let rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  if (rawUrl) {
    try {
      // Pastikan URL hanya mengambil root origin (misal: https://xxx.supabase.co tanpa /rest/v1 atau path lain)
      rawUrl = new URL(rawUrl.trim()).origin;
    } catch {
      // Abaikan jika format invalid agar zod safeParse menampilkan error yang jelas
    }
  }

  // Dukung format alternatif jika user memakai prefix VITE_ atau ANON_KEY dari frontend
  const envSource: Record<string, any> = {
    ...process.env,
    GEMINI_MODEL: rawModel,
    SUPABASE_URL: rawUrl,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY
  };

  const result = envSchema.safeParse(envSource);

  if (!result.success) {
    const errorDetails = result.error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');
    console.warn(`[WARNING] Beberapa variabel environment belum diatur secara lengkap:\n${errorDetails}`);
    
    // Berikan fallback objek jika dalam mode setup awal agar aplikasi tidak langsung crash saat inisialisasi awal
    return envSchema.parse({
      ...envSource,
      GEMINI_API_KEY: envSource.GEMINI_API_KEY || 'DUMMY_GEMINI_KEY_FOR_INIT',
      SUPABASE_URL: envSource.SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: envSource.SUPABASE_SERVICE_ROLE_KEY || 'DUMMY_SERVICE_KEY'
    });
  }

  return result.data;
};

export const env = parseEnv();

// Helper untuk mengambil daftar nomor HP Owner yang sudah dibersihkan
export const getOwnerPhoneList = (): string[] => {
  if (!env.OWNER_PHONE_NUMBERS) return [];
  return env.OWNER_PHONE_NUMBERS
    .split(',')
    .map(phone => phone.trim().replace(/[^0-9]/g, ''))
    .filter(Boolean);
};

