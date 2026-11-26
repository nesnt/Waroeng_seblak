import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah } from './formatters';

// Service UUID standar printer thermal BLE 58mm (Woya WP58D, POS-58, RPP02N, MPT-II, Xprinter, Gprinter, dll)
const KNOWN_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '000018f1-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

// Characteristic UUID cetak prioritas agar tidak salah menulis ke karakteristik kontrol/Generic Access
const KNOWN_WRITE_CHARS = new Set([
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '49535343-1e4d-4ae5-8fa9-9fafd205e455',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000fff2-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
]);

// Layanan standar Bluetooth SIG non-printer (Generic Access, Generic Attribute, Device Info, Battery)
const IGNORED_SIG_SERVICES = new Set([
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
  '0000180f-0000-1000-8000-00805f9b34fb',
]);

const REQUEST_DEVICE_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 12_000;
const DISCOVER_TIMEOUT_MS = 10_000;
const WRITE_CHUNK_TIMEOUT_MS = 6_000;

let cachedDevice: any = null;
let cachedCharacteristic: any = null;
let cachedWriteWithoutResponse = true;
const attachedDisconnectListeners = new WeakSet<object>();

export interface WebBluetoothPrintOptions {
  onProgress?: (stage: string) => void;
  signal?: AbortSignal;
  forceReselect?: boolean;
}

export interface WebBluetoothPrintResult {
  success: boolean;
  printerName?: string;
  error?: string;
  code?: 'unsupported' | 'insecure_context' | 'webview' | 'cancelled' | 'timeout' | 'connect_failed' | 'no_gatt' | 'write_failed';
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /; wv\)|FBAN|FBAV|Instagram|Line\/|TikTok|WhatsApp|Snapchat|Twitter|MicroMessenger/i.test(ua);
}

export function isWebBluetoothSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator &&
    typeof (navigator as any).bluetooth?.requestDevice === 'function'
  );
}

export function getWebBluetoothEnvironmentIssue(): { code: WebBluetoothPrintResult['code']; message: string } | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      code: 'unsupported',
      message: 'Web Bluetooth hanya tersedia di browser perangkat.',
    };
  }

  if (!window.isSecureContext) {
    return {
      code: 'insecure_context',
      message:
        'Cetak Bluetooth butuh alamat HTTPS (contoh: link Vercel). Saat ini halaman dibuka lewat HTTP biasa (IP lokal), sehingga browser memblokir Bluetooth.',
    };
  }

  if (isInAppWebView()) {
    return {
      code: 'webview',
      message:
        'Halaman sedang dibuka di browser bawaan aplikasi (WhatsApp/Instagram/WebView) yang tidak menampilkan popup Bluetooth. Ketuk menu titik tiga lalu pilih "Buka di Chrome".',
    };
  }

  if (!('bluetooth' in navigator) || typeof (navigator as any).bluetooth?.requestDevice !== 'function') {
    if (isIosDevice()) {
      return {
        code: 'unsupported',
        message:
          'Safari/Chrome di iPhone (iOS) belum mendukung Web Bluetooth. Gunakan Android (Google Chrome), aplikasi kasir iOS, atau tombol "Cetak Browser / PDF".',
      };
    }
    return {
      code: 'unsupported',
      message:
        'Browser ini tidak mendukung Web Bluetooth. Buka halaman ini di Google Chrome / Microsoft Edge (Android/Windows/Mac), atau pakai tombol "Cetak Browser / PDF".',
    };
  }

  return null;
}

export function hasConnectedBluetoothPrinter(): boolean {
  return Boolean(cachedDevice?.gatt?.connected && cachedCharacteristic);
}

export function getConnectedPrinterName(): string | null {
  return cachedDevice?.name || null;
}

export function resetWebBluetoothPrinter(): void {
  try {
    if (cachedDevice?.gatt?.connected) {
      cachedDevice.gatt.disconnect();
    }
  } catch {
    // Ignore disconnect errors
  }
  cachedDevice = null;
  cachedCharacteristic = null;
}

function createAbortError(): Error {
  const err = new Error('Proses cetak Bluetooth dibatalkan.');
  err.name = 'AbortError';
  return err;
}

function createTimeoutError(message: string): Error {
  const err = new Error(message);
  err.name = 'TimeoutError';
  return err;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  let timerId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const racePromises: Promise<T>[] = [
    promise,
    new Promise<T>((_, reject) => {
      timerId = setTimeout(() => reject(createTimeoutError(timeoutMessage)), ms);
    }),
  ];

  if (signal) {
    racePromises.push(
      new Promise<T>((_, reject) => {
        onAbort = () => reject(createAbortError());
        signal.addEventListener('abort', onAbort, { once: true });
      })
    );
  }

  try {
    return await Promise.race(racePromises);
  } finally {
    if (timerId !== undefined) clearTimeout(timerId);
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * Rakit byte ESC/POS struk thermal 58mm (format minimalis kasir & dapur, total diperbesar)
 */
export function generateEscPosBytes(
  transaction: Transaction,
  _settings: StoreSettings
): Uint8Array {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const addBytes = (arr: number[]) => {
    for (const b of arr) bytes.push(b);
  };
  const addText = (text: string) => {
    // Pastikan karakter murni ASCII aman untuk printer ESC/POS 58mm:
    // Intl.NumberFormat('id-ID') menghasilkan Non-Breaking Space (\u00A0) setelah "Rp" yang tercetak jadi simbol aneh
    const sanitized = text
      .replace(/[\u00A0\u202F\u2007\u2009\u200B]/g, ' ')
      .replace(/[•·–—]/g, '-')
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
    const encoded = encoder.encode(sanitized);
    for (const b of encoded) bytes.push(b);
  };

  // 1. Initialize ESC/POS
  addBytes([0x1b, 0x40]); // Reset printer
  addBytes([0x1b, 0x61, 0x00]); // Left align
  addBytes([0x1d, 0x21, 0x00]); // Ukuran font normal standar
  addBytes([0x1b, 0x45, 0x00]); // Normal weight

  // 2. Parser Detail Pesanan
  const combined = `${transaction.notes || ''} ${transaction.items
    .map((i) => i.notes || '')
    .join(' ')}`;

  let dineType = 'Makan di Sini';
  if (/dibungkus|takeaway|take away|bawa pulang/i.test(combined)) {
    dineType = 'Dibungkus';
  }

  let brothType = 'Asin Manis';
  const brothMatch = combined.match(/kuah[:\s]+([^|·,]+)/i);
  if (brothMatch && brothMatch[1]) {
    brothType = brothMatch[1].trim();
  }

  let spicy = 'Original';
  const spicyMatch = combined.match(/pedas[:\s]+([^|·,]+)/i);
  if (spicyMatch && spicyMatch[1]) {
    const raw = spicyMatch[1].trim();
    spicy = /^\d+$/.test(raw) ? `Level ${raw}` : raw;
  } else {
    const seblak = transaction.items.find((it) => it.levelPedas !== undefined);
    if (seblak) {
      spicy = seblak.levelPedas === 0 ? 'Original' : `Level ${seblak.levelPedas}`;
    }
  }

  let customerNote = '-';
  const noteMatch = combined.match(/catatan[:\s]+([^|·]+)/i);
  if (noteMatch && noteMatch[1]) {
    customerNote = noteMatch[1].trim();
  } else if (transaction.notes && !/kuah|pedas|makan di sini|dibungkus/i.test(transaction.notes)) {
    customerNote = transaction.notes.trim();
  }

  const bowlMatch =
    combined.match(/mangkuk[:\s]*#?([a-zA-Z0-9_-]+)/i) ||
    (transaction.customerName && transaction.customerName.match(/mangkuk[:\s]*#?([a-zA-Z0-9_-]+)/i));
  const bowlNumber = bowlMatch
    ? bowlMatch[1].startsWith('#')
      ? bowlMatch[1]
      : `#${bowlMatch[1]}`
    : '-';

  const cleanCustomerName =
    (transaction.customerName || 'Pelanggan Umum')
      .replace(/\s*\(\s*mangkuk[:\s]*#?[^)]+\)/i, '')
      .trim() || 'Pelanggan Umum';

  addText(`No. Mangkuk : ${bowlNumber}\n`);
  addText(`Pelanggan   : ${cleanCustomerName}\n`);
  addText(`Makan di    : ${dineType}\n`);
  addText(`Kuah        : ${brothType}\n`);
  addText(`Pedas       : ${spicy}\n`);
  addText(`Catatan     : ${customerNote}\n`);
  addText('--------------------------------\n');

  // 3. Pisahkan Topping & Minuman
  const drinkItems: OrderItem[] = [];
  const toppingMap = new Map<string, number>();

  transaction.items.forEach((item) => {
    const isDrink =
      item.menuItemId.startsWith('drink') ||
      (item.notes && item.notes.toLowerCase().includes('minuman')) ||
      item.menuItemName.toLowerCase().startsWith('es ') ||
      item.menuItemName.toLowerCase().includes('teh') ||
      item.menuItemName.toLowerCase().includes('jeruk') ||
      item.menuItemName.toLowerCase().includes('air mineral');

    if (isDrink) {
      drinkItems.push(item);
    } else if (item.toppings && item.toppings.length > 0) {
      item.toppings.forEach((t) => {
        toppingMap.set(t.name, (toppingMap.get(t.name) || 0) + 1);
      });
    }
  });

  const toppingsList = Array.from(toppingMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  addText('TOPPING:\n');
  if (toppingsList.length > 0) {
    toppingsList.forEach((t) => {
      addText(` - ${t.name} x${t.count}\n`);
    });
  } else {
    addText(' - Tanpa Topping -\n');
  }
  addText('--------------------------------\n');

  addText('MINUMAN:\n');
  if (drinkItems.length > 0) {
    drinkItems.forEach((d) => {
      addText(` - ${d.menuItemName} x${d.quantity}\n`);
    });
  } else {
    addText(' - Tanpa Minuman -\n');
  }
  addText('--------------------------------\n');

  // 4. Total Diperbesar (Double Width & Double Height + Bold)
  addBytes([0x1d, 0x21, 0x11]);
  addBytes([0x1b, 0x45, 0x01]);
  addText(`TOTAL: ${formatRupiah(transaction.totalAmount)}\n`);
  addBytes([0x1b, 0x45, 0x00]);
  addBytes([0x1d, 0x21, 0x00]);
  addText('\n\n');

  return new Uint8Array(bytes);
}

/**
 * Fallback cetak Android untuk printer Bluetooth Classic (SPP/non-BLE) melalui aplikasi RawBT.
 */
export function printViaRawBT(
  transaction: Transaction,
  settings: StoreSettings
): { success: boolean; error?: string } {
  try {
    const bytes = generateEscPosBytes(transaction, settings);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const intentUrl = `rawbt:base64,${base64}`;
    window.location.href = intentUrl;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal membuka aplikasi RawBT: ${err?.message || err}`,
    };
  }
}

async function resolveWritableCharacteristic(
  server: any,
  signal?: AbortSignal
): Promise<{
  characteristic: any;
  withoutResponse: boolean;
}> {
  const services: any[] = await withTimeout(
    server.getPrimaryServices(),
    DISCOVER_TIMEOUT_MS,
    'Waktu mencari layanan cetak GATT printer habis. Printer mungkin hanya mendukung Bluetooth Classic (SPP) atau sedang sibuk.',
    signal
  );

  // Prioritaskan layanan printer yang dikenal dulu, lalu layanan lain (skip layanan SIG non-printer)
  const prioritized = [...services].sort((a, b) => {
    const aKnown = KNOWN_BLE_SERVICES.includes(String(a?.uuid || '').toLowerCase()) ? 0 : 1;
    const bKnown = KNOWN_BLE_SERVICES.includes(String(b?.uuid || '').toLowerCase()) ? 0 : 1;
    return aKnown - bKnown;
  });

  let fallbackCandidate: { characteristic: any; withoutResponse: boolean } | null = null;

  for (const service of prioritized) {
    const svcUuid = String(service?.uuid || '').toLowerCase();
    if (IGNORED_SIG_SERVICES.has(svcUuid)) continue;

    try {
      const chars: any[] = await withTimeout(
        service.getCharacteristics(),
        5_000,
        'Waktu membaca karakteristik GATT printer habis.',
        signal
      );

      // 1) Cari characteristic UUID printer yang dikenal lebih dulu
      for (const ch of chars) {
        const chUuid = String(ch?.uuid || '').toLowerCase();
        const canWriteNoResp = Boolean(ch?.properties?.writeWithoutResponse);
        const canWrite = Boolean(ch?.properties?.write);
        if (!canWriteNoResp && !canWrite) continue;

        if (KNOWN_WRITE_CHARS.has(chUuid)) {
          return { characteristic: ch, withoutResponse: canWriteNoResp };
        }
        if (!fallbackCandidate) {
          fallbackCandidate = { characteristic: ch, withoutResponse: canWriteNoResp };
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      // Skip restricted/unreadable service
    }
  }

  if (fallbackCandidate) {
    return fallbackCandidate;
  }

  const err = new Error(
    'Printer Bluetooth tidak memiliki layanan cetak BLE GATT (Write). Jika printer Anda tipe Bluetooth Classic (SPP), gunakan RawBT atau Cetak Browser.'
  );
  err.name = 'NoGattPrinterServiceError';
  throw err;
}

async function writeChunkSafe(
  characteristic: any,
  chunk: Uint8Array,
  preferWithoutResponse: boolean,
  signal?: AbortSignal
): Promise<boolean> {
  const sendWithResponse = async () => {
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await withTimeout(
        characteristic.writeValueWithResponse(chunk),
        WRITE_CHUNK_TIMEOUT_MS,
        'Pengiriman data ke printer terhenti (timeout). Pastikan printer menyala & dekat dengan HP.',
        signal
      );
    } else {
      await withTimeout(
        characteristic.writeValue(chunk),
        WRITE_CHUNK_TIMEOUT_MS,
        'Pengiriman data ke printer terhenti (timeout). Pastikan printer menyala & dekat dengan HP.',
        signal
      );
    }
  };

  if (preferWithoutResponse && typeof characteristic.writeValueWithoutResponse === 'function') {
    try {
      await withTimeout(
        characteristic.writeValueWithoutResponse(chunk),
        WRITE_CHUNK_TIMEOUT_MS,
        'Pengiriman data ke printer terhenti (timeout). Pastikan printer menyala & dekat dengan HP.',
        signal
      );
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'TimeoutError') throw err;
      // Beberapa printer/browser menolak writeWithoutResponse meski flag-nya true -> fallback ke writeWithResponse
      await sendWithResponse();
      return false;
    }
  }

  await sendWithResponse();
  return false;
}

/**
 * Mencetak struk langsung ke printer thermal Bluetooth via Web Bluetooth API (berjalan di HTTPS Vercel & localhost)
 */
export async function printViaWebBluetooth(
  transaction: Transaction,
  settings: StoreSettings,
  options?: WebBluetoothPrintOptions
): Promise<WebBluetoothPrintResult> {
  const envIssue = getWebBluetoothEnvironmentIssue();
  if (envIssue) {
    return {
      success: false,
      code: envIssue.code,
      error: envIssue.message,
    };
  }

  const onProgress = options?.onProgress;
  const signal = options?.signal;
  let activeDevice: any = options?.forceReselect ? null : cachedDevice;

  if (options?.forceReselect) {
    resetWebBluetoothPrinter();
  }

  try {
    const bt = (navigator as any).bluetooth;

    // PENTING: requestDevice HARUS dipanggil langsung tanpa await sebelumnya agar user gesture browser terjaga
    if (!activeDevice) {
      onProgress?.('Membuka daftar perangkat Bluetooth...');
      activeDevice = await withTimeout(
        bt.requestDevice({
          acceptAllDevices: true,
          optionalServices: KNOWN_BLE_SERVICES,
        }),
        REQUEST_DEVICE_TIMEOUT_MS,
        'Dialog pilih printer Bluetooth tidak muncul/tidak merespons. Pastikan halaman dibuka di Google Chrome (bukan browser dalam WhatsApp/IG), serta Bluetooth & izin Lokasi/Perangkat Sekitar sudah aktif.',
        signal
      );
    }

    if (!activeDevice?.gatt) {
      throw new Error('Perangkat yang dipilih tidak mendukung koneksi BLE GATT.');
    }

    let characteristic = activeDevice === cachedDevice ? cachedCharacteristic : null;
    let withoutResponse = cachedWriteWithoutResponse;

    if (!activeDevice.gatt.connected || !characteristic) {
      onProgress?.(`Menghubungkan ke ${activeDevice.name || 'Printer Bluetooth'}...`);

      let server: any;
      try {
        server = await withTimeout(
          activeDevice.gatt.connect(),
          CONNECT_TIMEOUT_MS,
          `Gagal terhubung ke ${activeDevice.name || 'printer'} (timeout 12 detik). Pastikan printer menyala, tidak terhubung ke HP/aplikasi lain, dan mendukung BLE (bukan hanya Bluetooth Classic).`,
          signal
        );
      } catch (connectErr: any) {
        try {
          if (activeDevice.gatt?.connected) activeDevice.gatt.disconnect();
        } catch {
          // ignore
        }
        throw connectErr;
      }

      onProgress?.('Mencari layanan cetak printer...');
      const resolved = await resolveWritableCharacteristic(server, signal);
      characteristic = resolved.characteristic;
      withoutResponse = resolved.withoutResponse;

      // Baru simpan cache setelah connect & discovery benar-benar berhasil
      if (!attachedDisconnectListeners.has(activeDevice)) {
        attachedDisconnectListeners.add(activeDevice);
        activeDevice.addEventListener('gattserverdisconnected', () => {
          if (cachedDevice === activeDevice) {
            cachedCharacteristic = null;
          }
        });
      }
      cachedDevice = activeDevice;
      cachedCharacteristic = characteristic;
      cachedWriteWithoutResponse = withoutResponse;
    }

    const escPosData = generateEscPosBytes(transaction, settings);
    const CHUNK_SIZE = 20;
    const totalChunks = Math.ceil(escPosData.length / CHUNK_SIZE);

    for (let i = 0, offset = 0; offset < escPosData.length; i++, offset += CHUNK_SIZE) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      if (i === 0 || i % 4 === 0 || i === totalChunks - 1) {
        const pct = Math.min(100, Math.round(((i + 1) / totalChunks) * 100));
        onProgress?.(`Mengirim struk ke printer (${pct}%)...`);
      }

      const chunk = escPosData.slice(offset, offset + CHUNK_SIZE);
      withoutResponse = await writeChunkSafe(characteristic, chunk, withoutResponse, signal);
      cachedWriteWithoutResponse = withoutResponse;

      await new Promise((r) => setTimeout(r, 15));
    }

    return {
      success: true,
      printerName: activeDevice.name || 'Printer Thermal Bluetooth',
    };
  } catch (err: any) {
    const msg = String(err?.message || err || '');

    if (err?.name === 'AbortError') {
      resetWebBluetoothPrinter();
      return {
        success: false,
        code: 'cancelled',
        error: 'Proses cetak Bluetooth dibatalkan.',
      };
    }

    if (err?.name === 'NotFoundError' || /cancelled|canceled/i.test(msg)) {
      return {
        success: false,
        code: 'cancelled',
        error: 'Pemilihan printer Bluetooth dibatalkan.',
      };
    }

    // Bersihkan cache jika terjadi timeout/koneksi gagal/tidak ada GATT agar klik berikutnya bisa memilih ulang printer
    try {
      if (activeDevice?.gatt?.connected) {
        activeDevice.gatt.disconnect();
      }
    } catch {
      // ignore
    }
    cachedCharacteristic = null;
    cachedDevice = null;

    if (err?.name === 'TimeoutError') {
      return {
        success: false,
        code: 'timeout',
        error: msg,
      };
    }

    if (err?.name === 'NoGattPrinterServiceError') {
      return {
        success: false,
        code: 'no_gatt',
        error: msg,
      };
    }

    if (/User gesture|must be handling a user gesture/i.test(msg)) {
      return {
        success: false,
        code: 'connect_failed',
        error: 'Browser membutuhkan ketukan langsung pada tombol Cetak via Bluetooth. Silakan ketuk tombol lagi.',
      };
    }

    return {
      success: false,
      code: 'connect_failed',
      error: `Gagal mencetak via Bluetooth: ${msg || 'Pastikan printer menyala, Bluetooth & Lokasi HP aktif, dan printer tidak dipakai perangkat lain.'}`,
    };
  }
}
