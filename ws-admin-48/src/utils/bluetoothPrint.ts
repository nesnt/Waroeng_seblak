import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah, formatIndonesianDate } from './formatters';

/**
 * Utilitas Bluetooth Print ESC/POS untuk Printer Thermal 58mm (Woya WP58D)
 * Mendukung Web Bluetooth API di Chrome, Edge, dan Bluefy Browser di iOS.
 */

export function generateEscPosBytes(
  transaction: Transaction,
  settings: StoreSettings
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const writeBytes = (b: number[]) => chunks.push(new Uint8Array(b));
  const writeText = (t: string) => chunks.push(encoder.encode(t));

  // 1. Initialize ESC/POS
  writeBytes([0x1B, 0x40]); // ESC @

  // 2. Header Toko (Center align)
  writeBytes([0x1B, 0x61, 0x01]); // ESC a 1 (Center)
  writeBytes([0x1D, 0x21, 0x11]); // ESC ! (Double width & height)
  writeText(`${settings.storeName || 'WAROENG SEBLAK 48'}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal size

  if (settings.slogan) writeText(`${settings.slogan}\n`);
  if (settings.address) writeText(`${settings.address}\n`);
  if (settings.phone) writeText(`WA: ${settings.phone}\n`);

  writeText('--------------------------------\n');

  // 3. Info Transaksi (Left align)
  writeBytes([0x1B, 0x61, 0x00]); // ESC a 0 (Left)
  writeText(`No. Nota  : ${transaction.invoiceNumber}\n`);
  writeText(`Waktu     : ${formatIndonesianDate(transaction.date)}\n`);
  writeText(`Pelanggan : ${transaction.customerName || 'Pelanggan Umum'}\n`);
  writeText('--------------------------------\n');

  // 4. Detail Pesanan (Huruf Lebih Besar & Tebal)
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
  } else if (
    transaction.notes &&
    !transaction.notes.includes('|') &&
    !transaction.notes.includes('·') &&
    !transaction.notes.startsWith('[')
  ) {
    customerNote = transaction.notes.trim();
  }

  // Tulis detail dengan Double-Height (Huruf Besar)
  writeBytes([0x1D, 0x21, 0x01]); // Double height
  writeText(`MAKAN DI: ${dineType.toUpperCase()}\n`);
  writeText(`KUAH    : ${brothType.toUpperCase()}\n`);
  writeText(`PEDAS   : ${spicy.toUpperCase()}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal

  if (customerNote) {
    writeText(`Catatan : ${customerNote}\n`);
  }
  writeText('--------------------------------\n');

  // 5. Daftar Topping & Minuman
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

  writeText(`TOPPING ${totalToppingQty > 0 ? `(${totalToppingQty} pcs)` : ''}:\n`);
  if (toppingsList.length > 0) {
    toppingsList.forEach((t) => {
      writeText(` • ${t.name} x${t.count}\n`);
    });
  } else {
    writeText(' - Tanpa Topping Tambahan -\n');
  }

  writeText('--------------------------------\n');
  writeText('MINUMAN:\n');
  if (drinkItems.length > 0) {
    drinkItems.forEach((d) => {
      writeText(` • ${d.menuItemName} x${d.quantity}\n`);
    });
  } else {
    writeText(' - Tanpa Minuman -\n');
  }

  writeText('--------------------------------\n');

  // 6. TOTAL (Double Width & Height)
  writeBytes([0x1D, 0x21, 0x11]); // Double size
  writeText(`TOTAL: ${formatRupiah(transaction.totalAmount)}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal size
  writeText('--------------------------------\n');

  // 7. Footer (Center)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeText('Hatur Nuhun! Wilujeng Tuang!\n');
  writeText('Simpan struk bukti pembayaran.\n\n\n\n'); // Feed lines

  // 8. Cut command (GS V 66 0)
  writeBytes([0x1D, 0x56, 0x42, 0x00]);

  // Gabungkan semua buffer
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Kirim data struk langsung via Web Bluetooth API (BLE)
 */
export async function printDirectBluetooth(
  transaction: Transaction,
  settings: StoreSettings
): Promise<{ success: boolean; error?: string }> {
  const nav = navigator as any;
  if (!nav || !nav.bluetooth) {
    return {
      success: false,
      error:
        'Browser ini belum mengaktifkan Web Bluetooth. Di perangkat iOS (iPhone), silakan gunakan browser gratis "Bluefy - Web BLE Browser" dari App Store untuk mencetak langsung via Bluetooth, atau gunakan tombol "Cetak Struk (AirPrint)".',
    };
  }

  try {
    const rawData = generateEscPosBytes(transaction, settings);

    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ],
    });

    if (!device.gatt) throw new Error('Perangkat Bluetooth tidak memiliki GATT server.');

    const server = await device.gatt.connect();

    // Dapatkan service printer
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
      } catch (_) {}
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('Karakteristik write Bluetooth thermal tidak ditemukan pada perangkat ini.');
    }

    // Kirim per chunk 100 bytes untuk menjaga stabilitas buffer Woya WP58D
    const chunkSize = 100;
    for (let i = 0; i < rawData.length; i += chunkSize) {
      const chunk = rawData.slice(i, i + chunkSize);
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Jeda 20ms per chunk
      await new Promise((r) => setTimeout(r, 20));
    }

    // Disconnect setelah selesai
    setTimeout(() => {
      device.gatt?.disconnect();
    }, 500);

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'Pencarian perangkat dibatalkan.' };
    }
    return {
      success: false,
      error: `Koneksi Bluetooth gagal: ${err.message || err}`,
    };
  }
}
