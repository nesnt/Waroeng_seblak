import { Transaction, StoreSettings } from '../types';

export function isLocalKasirHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.')
  );
}

/**
 * Kirim permintaan cetak langsung ke printer thermal yang terhubung ke Laptop Kasir (POS58 / Woya WP58D via USB/Windows Spooler).
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
          'Printer kabel USB hanya aktif di server lokal laptop. Untuk cetak nirkabel dari web ini, silakan klik tombol "Cetak Bluetooth" atau "Cetak Browser / PDF".',
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error:
          'Server printer USB lokal tidak terdeteksi pada domain ini. Silakan klik "Cetak Bluetooth" atau "Cetak Browser / PDF".',
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
