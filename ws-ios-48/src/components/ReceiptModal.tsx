import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { printViaCapacitorBluetooth, resetPrinterBluetooth } from '../utils/capacitorBluetoothPrint';
import { printViaLaptopPrinter } from '../utils/laptopPrint';
import { Capacitor } from '@capacitor/core';
import { Printer, X, CheckCircle2, Info, Loader2, Check, Bluetooth } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
  title?: string;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
  title = 'Struk Pembayaran Kasir',
  autoPrint = true,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const hasAutoPrinted = useRef(false);

  // Otomatis cetak begitu modal struk terbuka (Auto-Print)
  useEffect(() => {
    if (!transaction || hasAutoPrinted.current || !autoPrint) return;
    hasAutoPrinted.current = true;
    handlePrintThermal(true);
  }, [transaction, autoPrint]);

  if (!transaction) return null;

  const handlePrintThermal = async (isAuto = false) => {
    setIsPrinting(true);
    setPrintStatus(null);
    try {
      if (Capacitor.isNativePlatform()) {
        // Cetak via Bluetooth Native iOS
        const res = await printViaCapacitorBluetooth(transaction, settings);
        if (res.success) {
          setPrintStatus({
            type: 'success',
            message: isAuto
              ? '✅ Struk dicetak otomatis via Bluetooth iOS!'
              : '✅ Struk berhasil dicetak via Bluetooth iOS!',
          });
        } else {
          setPrintStatus({
            type: 'error',
            message: res.error || 'Gagal mencetak via Bluetooth.',
          });
        }
      } else {
        // Fallback jika dibuka lewat browser biasa
        const res = await printViaLaptopPrinter(transaction, settings);
        if (res.success) {
          setPrintStatus({
            type: 'success',
            message: isAuto
              ? '✅ Struk otomatis dicetak di printer kasir (POS58)!'
              : '✅ Struk berhasil dicetak di printer kasir (POS58)!',
          });
        } else {
          setPrintStatus({
            type: 'error',
            message: res.error || 'Gagal mengirim perintah cetak ke laptop kasir.',
          });
        }
      }
    } catch (err: any) {
      setPrintStatus({
        type: 'error',
        message: err.message || 'Koneksi ke printer terputus.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  // Helper Parser: Ekstrak detail pesanan (Makan di mana, Kuah, Pedas, Catatan)
  const combinedNotes = `${transaction.notes || ''} ${
    transaction.items.map((it) => it.notes || '').join(' ')
  }`;

  // 1. Makan di mana
  let dineType = 'Makan di Sini';
  if (/dibungkus|takeaway|take away|bawa pulang/i.test(combinedNotes)) {
    dineType = 'Dibungkus';
  } else if (/makan di sini|dine in|dine-in/i.test(combinedNotes)) {
    dineType = 'Makan di Sini';
  }

  // 2. Kuah
  let brothType = 'Asin Manis';
  const brothMatch = combinedNotes.match(/kuah[:\s]+([^|·,]+)/i);
  if (brothMatch && brothMatch[1]) {
    brothType = brothMatch[1].trim();
  } else if (/asin manis/i.test(combinedNotes)) {
    brothType = 'Asin Manis';
  } else if (/gurih/i.test(combinedNotes)) {
    brothType = 'Gurih';
  } else if (/manis/i.test(combinedNotes)) {
    brothType = 'Manis';
  }

  // 3. Pedas
  let spicy = 'Original';
  const spicyMatch = combinedNotes.match(/pedas[:\s]+([^|·,]+)/i);
  if (spicyMatch && spicyMatch[1]) {
    const raw = spicyMatch[1].trim();
    spicy = /^\d+$/.test(raw) ? `Level ${raw}` : raw;
  } else {
    const seblakItem = transaction.items.find((it) => it.levelPedas !== undefined);
    if (seblakItem) {
      spicy = seblakItem.levelPedas === 0 ? 'Original' : `Level ${seblakItem.levelPedas}`;
    }
  }

  // 4. Catatan Khusus
  let customerNote = '';
  const noteMatch = combinedNotes.match(/catatan[:\s]+([^|·]+)/i);
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

  // Pisahkan Topping & Minuman
  const drinkItems: OrderItem[] = [];
  const toppingMap = new Map<string, { count: number; price: number }>();

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
        item.toppings.forEach((top) => {
          const prev = toppingMap.get(top.name);
          if (prev) {
            prev.count += 1;
          } else {
            toppingMap.set(top.name, { count: 1, price: top.price });
          }
        });
      }
    }
  });

  const toppingsList = Array.from(toppingMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    price: data.price,
  }));

  // Fallback jika toppings belum di array objek tapi ada di teks catatan
  if (toppingsList.length === 0) {
    const topStrMatch = combinedNotes.match(/topping[:\s]+([^·|]+)/i);
    if (topStrMatch && topStrMatch[1]) {
      const parts = topStrMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        const qtyMatch = p.match(/(.+?)\s*x\s*(\d+)/i);
        if (qtyMatch) {
          toppingsList.push({
            name: qtyMatch[1].trim(),
            count: parseInt(qtyMatch[2], 10) || 1,
            price: 0,
          });
        } else {
          toppingsList.push({ name: p, count: 1, price: 0 });
        }
      });
    }
  }

  const totalToppingQty = toppingsList.reduce((acc, t) => acc + t.count, 0);

  return createPortal(
    <div className="receipt-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="receipt-modal-box bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal (Layar Only) */}
        <div className="no-print flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                {title}
              </h3>
              <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                Format Thermal 58mm (Woya WP58D)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Petunjuk (Layar Only) */}
        <div className="no-print px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>Detail pesanan dicetak lebih besar agar mudah dibaca dapur & kasir.</span>
        </div>

        {/* Struk Content (Format Standar Thermal 58mm) */}
        <div className="receipt-scroll-container p-4 sm:p-5 overflow-y-auto flex-1 flex justify-center bg-stone-100 dark:bg-stone-950/40">
          <div
            id="printable-receipt"
            className="w-full max-w-[310px] bg-white dark:bg-stone-950 p-4 rounded-xl border border-dashed border-stone-400 dark:border-stone-700 font-sans text-xs text-stone-950 dark:text-stone-50 shadow-sm space-y-2.5"
          >
            {/* 1. Header Toko */}
            <div className="text-center space-y-0.5 pb-2 border-b-2 border-dashed border-stone-800 dark:border-stone-300 print:border-black print:border-b-2">
              <h4 className="font-black text-base uppercase tracking-wider text-stone-950 dark:text-white print:text-black leading-tight">
                {settings.storeName || 'WAROENG SEBLAK 48'}
              </h4>
              {settings.slogan && (
                <p className="text-[11px] font-bold text-stone-800 dark:text-stone-200 print:text-black">
                  {settings.slogan}
                </p>
              )}
              {settings.address && (
                <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 print:text-black leading-tight">
                  {settings.address}
                </p>
              )}
              {settings.phone && (
                <p className="text-[11px] font-bold text-stone-800 dark:text-stone-200 print:text-black">
                  WA: {settings.phone}
                </p>
              )}
            </div>

            {/* 2. Info Transaksi (Hanya: No, Waktu, dan Nama Pelanggan) */}
            <div className="space-y-1 py-1.5 border-b-2 border-dashed border-stone-800 dark:border-stone-300 print:border-black print:border-b-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-stone-900 dark:text-stone-100 print:text-black">No. Nota:</span>
                <span className="font-black print:text-black">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-stone-900 dark:text-stone-100 print:text-black">Waktu:</span>
                <span className="print:text-black font-bold">{formatIndonesianDate(transaction.date)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-stone-900 dark:text-stone-100 print:text-black">Pelanggan:</span>
                <span className="font-black print:text-black break-words text-right max-w-[170px]">
                  {transaction.customerName || 'Pelanggan Umum'}
                </span>
              </div>
            </div>

            {/* 3. Detail Pesanan (KHUSUS BAGIAN INI CETAK DENGAN UKURAN TULISAN LEBIH BESAR & BOLD) */}
            <div className="order-details-box py-2 border-b-2 border-dashed border-stone-800 dark:border-stone-300 print:border-black print:border-b-2 space-y-1 bg-stone-50 dark:bg-stone-900/60 print:bg-transparent p-2 rounded-lg print:p-0">
              <div className="flex justify-between items-center text-sm print:text-base font-black text-stone-950 dark:text-white print:text-black">
                <span>Makan di:</span>
                <span className="order-val uppercase tracking-wide">{dineType}</span>
              </div>
              <div className="flex justify-between items-center text-sm print:text-base font-black text-stone-950 dark:text-white print:text-black">
                <span>Kuah:</span>
                <span className="order-val uppercase tracking-wide">{brothType}</span>
              </div>
              <div className="flex justify-between items-center text-sm print:text-base font-black text-stone-950 dark:text-white print:text-black">
                <span>Pedas:</span>
                <span className="order-val uppercase tracking-wide text-red-600 dark:text-red-400 print:text-black">
                  {spicy}
                </span>
              </div>
              {customerNote && (
                <div className="pt-1 border-t border-dashed border-stone-400 print:border-black text-xs print:text-sm font-black text-stone-900 dark:text-stone-100 print:text-black leading-tight">
                  <span>Catatan: </span>
                  <span className="italic">{customerNote}</span>
                </div>
              )}
            </div>

            {/* 4. Daftar Topping & Minuman (Yang Jelas Minumannya) */}
            <div className="py-2 border-b-2 border-dashed border-stone-800 dark:border-stone-300 print:border-black print:border-b-2 space-y-2">
              {/* List Topping */}
              <div>
                <div className="text-[11px] font-black uppercase text-stone-600 dark:text-stone-300 print:text-black mb-1">
                  TOPPING {totalToppingQty > 0 ? `(${totalToppingQty} pcs)` : ''}:
                </div>
                {toppingsList.length > 0 ? (
                  <div className="space-y-0.5 pl-1">
                    {toppingsList.map((t, idx) => (
                      <div key={idx} className="flex justify-between text-xs font-bold leading-tight">
                        <span className="print:text-black">• {t.name} x{t.count}</span>
                        {t.price > 0 && (
                          <span className="print:text-black">{formatRupiah(t.price * t.count)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-semibold italic text-stone-600 dark:text-stone-400 print:text-black pl-1">
                    - Tanpa Topping Tambahan -
                  </div>
                )}
              </div>

              {/* List Minuman (Yang Jelas Minumannya) */}
              <div className="pt-1.5 border-t border-dashed border-stone-300 dark:border-stone-700 print:border-black">
                <div className="text-[11px] font-black uppercase text-stone-600 dark:text-stone-300 print:text-black mb-1">
                  MINUMAN:
                </div>
                {drinkItems.length > 0 ? (
                  <div className="space-y-1 pl-1">
                    {drinkItems.map((drink, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs font-black leading-tight">
                        <span className="flex-1 pr-2 print:text-black">🥤 {drink.menuItemName} x{drink.quantity}</span>
                        <span className="shrink-0 print:text-black">{formatRupiah(drink.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-semibold italic text-stone-600 dark:text-stone-400 print:text-black pl-1">
                    - Tanpa Minuman -
                  </div>
                )}
              </div>
            </div>

            {/* 5. Bagian Harga (CUKUP TOTAL SAJA, Tanpa Metode / Tunai / Kembalian) */}
            <div className="py-2.5 border-b-2 border-dashed border-stone-800 dark:border-stone-300 print:border-black print:border-b-2">
              <div className="flex justify-between items-center font-black text-base print:text-lg text-stone-950 dark:text-white print:text-black">
                <span>TOTAL:</span>
                <span className="text-lg print:text-xl">{formatRupiah(transaction.totalAmount)}</span>
              </div>
            </div>

            {/* 6. Footer Struk */}
            <div className="text-center pt-2 text-[11px] text-stone-800 dark:text-stone-200 print:text-black space-y-0.5 pb-1 font-bold">
              <p className="font-black text-stone-950 dark:text-white print:text-black">
                Hatur Nuhun! Wilujeng Tuang!
              </p>
              <p>Simpan struk ini sebagai bukti pembayaran.</p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi (Layar Only) */}
        <div className="no-print p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
          {printStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                printStatus.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <span>{printStatus.message}</span>
              {printStatus.type === 'error' && Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  onClick={async () => {
                    await resetPrinterBluetooth();
                    handlePrintThermal(false);
                  }}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  Pilih Ulang Printer
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => handlePrintThermal(false)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-98 transition cursor-pointer disabled:opacity-50"
              title="Kirim ulang struk ke printer thermal kasir"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrinting ? 'Mencetak...' : 'Cetak Ulang (Printer Thermal)'}</span>
            </button>

            <button
              type="button"
              onClick={handleBrowserPrint}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 font-bold text-xs sm:text-sm active:scale-98 transition cursor-pointer"
              title="Cetak lewat dialog browser standar / AirPrint"
            >
              <span>Dialog Print (AirPrint)</span>
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-6 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>

          <p className="text-[10.5px] text-center text-stone-500 dark:text-stone-400 leading-tight">
            ⚡ <strong>Cetak Otomatis Aktif</strong>: Begitu transaksi selesai, struk langsung keluar dari printer kasir di laptop.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
