import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah } from './formatters';

// Service UUID standar printer thermal BLE 58mm (Woya WP58D, POS-58, RPP02N, MPT-II, dll)
const KNOWN_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

let cachedDevice: any = null;
let cachedCharacteristic: any = null;
let cachedWriteWithoutResponse = true;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
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
    const encoded = encoder.encode(text);
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
      addText(` • ${t.name} x${t.count}\n`);
    });
  } else {
    addText(' - Tanpa Topping -\n');
  }
  addText('--------------------------------\n');

  addText('MINUMAN:\n');
  if (drinkItems.length > 0) {
    drinkItems.forEach((d) => {
      addText(` • ${d.menuItemName} x${d.quantity}\n`);
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

async function resolveWritableCharacteristic(server: any): Promise<{
  characteristic: any;
  withoutResponse: boolean;
}> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties?.writeWithoutResponse) {
          return { characteristic: ch, withoutResponse: true };
        }
        if (ch.properties?.write) {
          return { characteristic: ch, withoutResponse: false };
        }
      }
    } catch {
      // Skip restricted service
    }
  }
  throw new Error('Printer Bluetooth tidak memiliki layanan cetak GATT (Write) yang kompatibel.');
}

/**
 * Mencetak struk langsung ke printer thermal Bluetooth via Web Bluetooth API (berjalan di HTTPS Vercel & localhost)
 */
export async function printViaWebBluetooth(
  transaction: Transaction,
  settings: StoreSettings
): Promise<{ success: boolean; printerName?: string; error?: string }> {
  if (!isWebBluetoothSupported()) {
    return {
      success: false,
      error:
        'Browser ini tidak mendukung Web Bluetooth. Gunakan Google Chrome / Microsoft Edge di Windows, Mac, atau Android, atau pakai tombol "Cetak Browser / PDF".',
    };
  }

  try {
    const bt = (navigator as any).bluetooth;

    if (!cachedDevice) {
      cachedDevice = await bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_BLE_SERVICES,
      });
      cachedDevice.addEventListener('gattserverdisconnected', () => {
        cachedCharacteristic = null;
      });
    }

    if (!cachedDevice.gatt.connected || !cachedCharacteristic) {
      const server = await cachedDevice.gatt.connect();
      const resolved = await resolveWritableCharacteristic(server);
      cachedCharacteristic = resolved.characteristic;
      cachedWriteWithoutResponse = resolved.withoutResponse;
    }

    const escPosData = generateEscPosBytes(transaction, settings);
    const CHUNK_SIZE = 20;

    for (let offset = 0; offset < escPosData.length; offset += CHUNK_SIZE) {
      const chunk = escPosData.slice(offset, offset + CHUNK_SIZE);
      if (cachedWriteWithoutResponse && typeof cachedCharacteristic.writeValueWithoutResponse === 'function') {
        await cachedCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await cachedCharacteristic.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 15));
    }

    return {
      success: true,
      printerName: cachedDevice.name || 'Printer Thermal Bluetooth',
    };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (err?.name === 'NotFoundError' || /cancelled|canceled/i.test(msg)) {
      return {
        success: false,
        error: 'Pemilihan printer Bluetooth dibatalkan.',
      };
    }

    // Reset cache bila koneksi terputus di tengah jalan agar percobaan berikutnya memilih ulang
    cachedCharacteristic = null;
    if (/GATT|disconnected|NetworkError/i.test(msg)) {
      cachedDevice = null;
    }

    return {
      success: false,
      error: `Gagal mencetak via Bluetooth: ${msg || 'Pastikan printer menyala & Bluetooth aktif.'}`,
    };
  }
}
