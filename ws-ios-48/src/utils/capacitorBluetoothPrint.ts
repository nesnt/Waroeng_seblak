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

/**
 * Rakit byte ESC/POS struk thermal 58mm
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

  // 1. Initialize ESC/POS
  addBytes([0x1B, 0x40]);

  // 2. Header Toko (Center)
  addBytes([0x1B, 0x61, 0x01]);
  addBytes([0x1D, 0x21, 0x11]); // Double width & height
  addText(`${settings.storeName || 'WAROENG SEBLAK 48'}\n`);
  addBytes([0x1D, 0x21, 0x00]); // Normal

  if (settings.slogan) addText(`${settings.slogan}\n`);
  if (settings.address) addText(`${settings.address}\n`);
  if (settings.phone) addText(`WA: ${settings.phone}\n`);
  addText('--------------------------------\n');

  // 3. Info Transaksi (Left)
  addBytes([0x1B, 0x61, 0x00]);
  addText(`No. Nota  : ${transaction.invoiceNumber}\n`);
  addText(`Waktu     : ${formatIndonesianDate(transaction.date)}\n`);
  addText(`Pelanggan : ${transaction.customerName || 'Pelanggan Umum'}\n`);
  addText('--------------------------------\n');

  // 4. Detail Pesanan (Huruf Lebih Besar & Bold)
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

  let customerNote = '';
  const noteMatch = combined.match(/catatan[:\s]+([^|·]+)/i);
  if (noteMatch && noteMatch[1]) {
    customerNote = noteMatch[1].trim();
  }

  addBytes([0x1D, 0x21, 0x01]); // Double height
  addText(`MAKAN DI: ${dineType.toUpperCase()}\n`);
  addText(`KUAH    : ${brothType.toUpperCase()}\n`);
  addText(`PEDAS   : ${spicy.toUpperCase()}\n`);
  addBytes([0x1D, 0x21, 0x00]); // Normal

  if (customerNote) {
    addText(`Catatan : ${customerNote}\n`);
  }
  addText('--------------------------------\n');

  // 5. Topping & Minuman
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
  const totalToppingQty = toppingsList.reduce((acc, t) => acc + t.count, 0);

  addText(`TOPPING ${totalToppingQty > 0 ? `(${totalToppingQty} pcs)` : ''}:\n`);
  if (toppingsList.length > 0) {
    toppingsList.forEach((t) => {
      addText(` • ${t.name} x${t.count}\n`);
    });
  } else {
    addText(' - Tanpa Topping Tambahan -\n');
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

  // 6. TOTAL (Double Width & Height)
  addBytes([0x1D, 0x21, 0x11]);
  addText(`TOTAL: ${formatRupiah(transaction.totalAmount)}\n`);
  addBytes([0x1D, 0x21, 0x00]);
  addText('--------------------------------\n');

  // 7. Footer (Center)
  addBytes([0x1B, 0x61, 0x01]);
  addText('Hatur Nuhun! Wilujeng Tuang!\n');
  addText('Simpan struk bukti pembayaran.\n\n\n\n');

  // 8. Cut
  addBytes([0x1D, 0x56, 0x42, 0x00]);

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

    // 2. Pilih / Hubungkan ke printer
    let deviceId = lastConnectedDeviceId;

    if (!deviceId) {
      const device = await BleClient.requestDevice({
        optionalServices: KNOWN_SERVICES,
      });
      deviceId = device.deviceId;
      lastConnectedDeviceId = deviceId;
    }

    // 3. Connect ke printer
    await BleClient.connect(deviceId);

    // 4. Cari service dan characteristic write yang cocok
    const rawBytes = generateEscPosBytes(transaction, settings);

    let targetService = '';
    let targetChar = '';

    for (const s of KNOWN_SERVICES) {
      for (const c of KNOWN_CHARS) {
        try {
          const testChunk = numbersToDataView([0x1B, 0x40]);
          await BleClient.writeWithoutResponse(deviceId, s, c, testChunk);
          targetService = s;
          targetChar = c;
          break;
        } catch (_) {}
      }
      if (targetService) break;
    }

    if (!targetService || !targetChar) {
      targetService = '0000ffe0-0000-1000-8000-00805f9b34fb';
      targetChar = '0000ffe1-0000-1000-8000-00805f9b34fb';
    }

    // 5. Kirim data per chunk 100 bytes
    const chunkSize = 100;
    for (let i = 0; i < rawBytes.length; i += chunkSize) {
      const chunk = rawBytes.slice(i, i + chunkSize);
      const dataView = numbersToDataView(chunk);
      try {
        await BleClient.writeWithoutResponse(deviceId, targetService, targetChar, dataView);
      } catch {
        await BleClient.write(deviceId, targetService, targetChar, dataView);
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    // Beri jeda lalu disconnect
    setTimeout(async () => {
      try {
        if (deviceId) await BleClient.disconnect(deviceId);
      } catch (_) {}
    }, 500);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Koneksi Bluetooth gagal: ${err.message || err}`,
    };
  }
}
