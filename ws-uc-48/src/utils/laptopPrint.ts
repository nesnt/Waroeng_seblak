import { Transaction, StoreSettings } from '../types';

/**
 * Kirim permintaan cetak langsung ke printer thermal yang terhubung ke Laptop Kasir (POS58 / Woya WP58D via USB/Bluetooth)
 */
export async function printViaLaptopPrinter(
  transaction: Transaction,
  settings: StoreSettings
): Promise<{ success: boolean; message?: string; printer?: string; error?: string }> {
  try {
    const res = await fetch('/api/print-thermal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction, settings }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal menghubungi server laptop: ${err.message || 'Koneksi terputus'}`,
    };
  }
}
