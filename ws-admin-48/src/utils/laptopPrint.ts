import { Transaction, StoreSettings } from '../types';

/**
 * Kirim permintaan cetak langsung ke printer thermal yang terhubung ke Laptop Kasir (POS58 / Woya WP58D via USB/Bluetooth).
 * Jika dijalankan di server cloud (misal Vercel) di mana endpoint lokal tidak tersedia, berikan pesan panduan jelas.
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

    if (res.status === 404 || res.status === 405) {
      return {
        success: false,
        error:
          'Cetak thermal otomatis hanya aktif pada server lokal kasir. Di versi web cloud, silakan gunakan tombol "Cetak Browser / PDF".',
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error:
          'Server cetak lokal tidak terdeteksi pada domain ini. Gunakan tombol "Cetak Browser / PDF".',
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal menghubungi server cetak lokal: ${err.message || 'Koneksi terputus'}`,
    };
  }
}
