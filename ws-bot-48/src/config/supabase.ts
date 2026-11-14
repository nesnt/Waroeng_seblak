import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi!');
}

/**
 * Supabase Client yang berjalan dengan Service Role Key di backend.
 * Mengizinkan pembacaan & pembaruan stok serta transaksi tanpa restriksi RLS publik.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

