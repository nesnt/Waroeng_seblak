import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah, formatIndonesianDate } from './formatters';

// Service & Characteristic UUID yang umum pada printer thermal 58mm (Woya WP58D, POS-58)
const KNOWN_SERVICES = [
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const KNOWN_CHARS = [
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-1e4d-4ae5-8fa9-9fafd205e455',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
];

let lastConnectedDeviceId: string | null = null;

export async function resetPrinterBluetooth(): Promise<void> {
  if (lastConnectedDeviceId) {
    try {
      await BleClient.disconnect(lastConnectedDeviceId);
    } catch (_) {}
  }
  lastConnectedDeviceId = null;
}

/**
 * Temukan Service dan Characteristic yang valid dari GATT table
 */
async function discoverPrinterGatt(deviceId: string): Promise<{
  service: string;
  char: string;
  useWithoutResponse: boolean;
}> {
  // Panggil getServices untuk menginisialisasi GATT cache di Apple CoreBluetooth
  const services = await BleClient.getServices(deviceId);

  let targetService = '';
  let targetChar = '';
  let useWithoutResponse = true;

  for (const s of services) {
    for (const c of s.characteristics) {
      if (c.properties.writeWithoutResponse) {
        targetService = s.uuid;
        targetChar = c.uuid;
        useWithoutResponse = true;
        break;
      } else if (c.properties.write) {
        targetService = s.uuid;
        targetChar = c.uuid;
        useWithoutResponse = false;
        break;
      }
    }
    if (targetService) break;
  }

  // Fallback standar thermal POS-58
  if (!targetService || !targetChar) {
    targetService = '0000ffe0-0000-1000-8000-00805f9b34fb';
    targetChar = '0000ffe1-0000-1000-8000-00805f9b34fb';
  }

  return { service: targetService, char: targetChar, useWithoutResponse };
}

/**
 * Rakit byte ESC/POS struk thermal 58mm
 * Hanya mencakup: Pelanggan, Makan di mana, Kuah, Pedas, Catatan, Topping, Minuman, Total.
 * Semua teks menggunakan ukuran font yang sama (standar ESC/POS).
 */
export function generateEscPosBytes(
  transaction: Transaction,
  settings: StoreSettings
): number[] {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const addBytes = (arr: number[]) => {
    for (const b of arr) bytes.push(b);
  };
  const addText = (text: string) => {
    const encoded = encoder.encode(text);
    for (const b of encoded) bytes.push(b);
  };

  // 1. Initialize ESC/POS (Left align & Standard Normal Font Size)
  addBytes([0x1B, 0x40]); // Reset printer
  addBytes([0x1B, 0x61, 0x00]); // Left align
  addBytes([0x1D, 0x21, 0x00]); // Ukuran font normal standar
  addBytes([0x1B, 0x45, 0x00]); // Normal weight

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

  // 3. Info Pelanggan & Mangkuk
  addText(`Pelanggan : ${transaction.customerName || 'Pelanggan Umum'}\n`);
  addText(`Makan di  : ${dineType}\n`);
  addText(`Kuah      : ${brothType}\n`);
  addText(`Pedas     : ${spicy}\n`);
  addText(`Catatan   : ${customerNote}\n`);
  addText('--------------------------------\n');

  // 4. Pisahkan Topping & Minuman
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
    } else {
      if (item.toppings && item.toppings.length > 0) {
        item.toppings.forEach((t) => {
          toppingMap.set(t.name, (toppingMap.get(t.name) || 0) + 1);
        });
      }
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

  // 5. Total (Perbesar: Double Width & Double Height + Bold)
  addBytes([0x1D, 0x21, 0x11]); // Double width & height
  addBytes([0x1B, 0x45, 0x01]); // Bold
  addText(`TOTAL: ${formatRupiah(transaction.totalAmount)}\n`);
  addBytes([0x1B, 0x45, 0x00]); // Reset bold
  addBytes([0x1D, 0x21, 0x00]); // Reset size
  // Hemat kertas: berhenti langsung setelah TOTAL tanpa feed kosong berlebih
  addText('\n');

  return bytes;
}

/**
 * Cetak Struk via Native iOS CoreBluetooth (Capacitor)
 */
export async function printViaCapacitorBluetooth(
  transaction: Transaction,
  settings: StoreSettings
): Promise<{ success: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: 'Fitur cetak native Bluetooth hanya aktif saat dijalankan di aplikasi iPhone (iOS).',
    };
  }

  try {
    // 1. Inisialisasi Bluetooth
    await BleClient.initialize();

    let deviceId = lastConnectedDeviceId;
    let targetService = '';
    let targetChar = '';
    let useWithoutResponse = true;

    // 2. Coba reconnect ke printer sebelumnya jika ada
    if (deviceId) {
      try {
        await BleClient.connect(deviceId);
        const gatt = await discoverPrinterGatt(deviceId);
        targetService = gatt.service;
        targetChar = gatt.char;
        useWithoutResponse = gatt.useWithoutResponse;
      } catch (reconnectErr) {
        console.warn('[BLE] Re-connect gagal, meminta scan ulang:', reconnectErr);
        try {
          await BleClient.disconnect(deviceId);
        } catch (_) {}
        deviceId = null;
        lastConnectedDeviceId = null;
      }
    }

    // 3. Jika belum terhubung, minta user pilih perangkat
    if (!deviceId) {
      const device = await BleClient.requestDevice({
        optionalServices: KNOWN_SERVICES,
      });
      deviceId = device.deviceId;
      lastConnectedDeviceId = deviceId;

      await BleClient.connect(deviceId);
      const gatt = await discoverPrinterGatt(deviceId);
      targetService = gatt.service;
      targetChar = gatt.char;
      useWithoutResponse = gatt.useWithoutResponse;
    }

    // 4. Rakit ESC/POS
    const rawBytes = generateEscPosBytes(transaction, settings);

    // 5. Kirim data per chunk 80 bytes
    const chunkSize = 80;
    for (let i = 0; i < rawBytes.length; i += chunkSize) {
      const chunk = rawBytes.slice(i, i + chunkSize);
      const dataView = numbersToDataView(chunk);
      if (useWithoutResponse) {
        try {
          await BleClient.writeWithoutResponse(deviceId, targetService, targetChar, dataView);
        } catch (_) {
          await BleClient.write(deviceId, targetService, targetChar, dataView);
        }
      } else {
        await BleClient.write(deviceId, targetService, targetChar, dataView);
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    // 6. Beri jeda 400ms agar buffer printer selesai mencetak, lalu disconnect bersih
    await new Promise((r) => setTimeout(r, 400));
    try {
      await BleClient.disconnect(deviceId);
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    // Reset cache jika terjadi error agar transaksi berikutnya selalu mulai dari kondisi bersih
    lastConnectedDeviceId = null;
    return {
      success: false,
      error: `Koneksi Bluetooth gagal: ${err.message || err}`,
    };
  }
}
