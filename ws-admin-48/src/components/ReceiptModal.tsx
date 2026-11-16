import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, StoreSettings, OrderItem } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import {
  printDirectBluetooth,
  generateReceiptPlainText,
  copyTextToClipboard,
} from '../utils/bluetoothPrint';
import {
  Printer,
  X,
  CheckCircle2,
  Info,
  Bluetooth,
  Loader2,
  Check,
  Copy,
  Download,
  FileText,
} from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);
  const [btStatusType, setBtStatusType] = useState<'success' | 'error'>('success');
  const [isCopied, setIsCopied] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  if (!transaction) return null;

  const plainReceiptText = generateReceiptPlainText(transaction, settings);

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setIsPrintingBt(true);
    setBtStatusMsg(null);
    try {
      const res = await printDirectBluetooth(transaction, settings);
      if (res.success) {
        setBtStatusType('success');
        setBtStatusMsg('✅ Struk berhasil dikirim ke printer Bluetooth Woya WP58D!');
      } else {
        setBtStatusType('error');
        setBtStatusMsg(res.error || 'Gagal mencetak via Bluetooth.');
      }
    } catch (e: any) {
      setBtStatusType('error');
      setBtStatusMsg(e.message || 'Terjadi kesalahan koneksi Bluetooth.');
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleShareOrCopy = async () => {
    // 1. Jika Web Share API didukung (misal di Safari iOS HTTPS)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Struk ${transaction.invoiceNumber}`,
          text: plainReceiptText,
        });
        setBtStatusType('success');
        setBtStatusMsg('✅ Struk berhasil dibagikan!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // 2. Salin langsung ke clipboard dengan universal fallback (bekerja di iOS Safari HTTP LAN)
    const success = await copyTextToClipboard(plainReceiptText);
    setShowRawText(true);
    if (success) {
      setIsCopied(true);
      setBtStatusType('success');
      setBtStatusMsg('✅ Teks struk berhasil disalin! Silakan buka aplikasi Thermer -> Paste (Tempel) -> Cetak.');
      setTimeout(() => setIsCopied(false), 3000);
    } else {
      setBtStatusType('success');
      setBtStatusMsg('📋 Teks struk siap disalin di bawah. Tekan tombol "Salin Semua".');
    }
  };

  const handleCopyOnly = async () => {
    const success = await copyTextToClipboard(plainReceiptText);
    if (success) {
      setIsCopied(true);
      setBtStatusType('success');
      setBtStatusMsg('✅ Teks struk berhasil disalin ke clipboard!');
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleDownloadTxt = () => {
    try {
      const blob = new Blob([plainReceiptText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `struk-${transaction.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBtStatusType('success');
      setBtStatusMsg('✅ File struk (.txt) berhasil diunduh!');
    } catch (e: any) {
      console.error('Download gagal:', e);
    }
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
                Struk Transaksi Penjualan
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
        <div className="receipt-scroll-container p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center bg-stone-100 dark:bg-stone-950/40 space-y-4">
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

          {/* Kotak Teks Struk untuk Thermer (Layar Only) */}
          {showRawText && (
            <div className="no-print w-full max-w-[310px] bg-white dark:bg-stone-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-3.5 shadow-sm space-y-2.5 text-stone-900 dark:text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                  <span>Format Teks (Thermer)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRawText(false)}
                  className="text-[11px] font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  Sembunyikan
                </button>
              </div>

              <textarea
                readOnly
                rows={7}
                value={plainReceiptText}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full text-[11px] font-mono p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-500 select-all"
                title="Klik untuk memilih semua teks"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyOnly}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm active:scale-98 transition cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin Semua'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs active:scale-98 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .txt</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[10.5px] text-blue-900 dark:text-blue-300 space-y-1">
                <p className="font-bold">📱 Cara Cetak di Thermer (iPhone):</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-0.5 leading-relaxed">
                  <li>Teks struk otomatis disalin ke clipboard.</li>
                  <li>Buka aplikasi <strong>Thermer</strong> di iPhone Anda.</li>
                  <li>Pilih menu <strong>Text</strong> / <strong>Print Text</strong>.</li>
                  <li><strong>Tempel (Paste)</strong> teks, lalu tekan <strong>Print</strong>!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Tombol Aksi (Layar Only) */}
        <div className="no-print p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
          {btStatusMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold ${
                btStatusType === 'error'
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              {btStatusMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-98 transition cursor-pointer"
              title="Cetak lewat dialog browser / AirPrint"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (AirPrint)</span>
            </button>

            <button
              type="button"
              onClick={handleShareOrCopy}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 font-black text-xs sm:text-sm shadow-md active:scale-98 transition cursor-pointer"
              title="Salin teks struk untuk dicetak lewat aplikasi Thermer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                  <span>Salin Struk (Thermer)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPrintingBt}
              onClick={handleBluetoothPrint}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 font-bold text-xs sm:text-sm active:scale-98 transition cursor-pointer disabled:opacity-50"
              title="Cetak langsung via Bluetooth (Khusus Web Bluetooth)"
            >
              {isPrintingBt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bluetooth className="w-4 h-4 text-blue-600" />
              )}
              <span>Bluetooth Direct</span>
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
            💡 Di iPhone: Tekan <strong>Salin Struk (Thermer)</strong> lalu tempel di aplikasi Thermer untuk mencetak ke Woya WP58D, atau gunakan <strong>Cetak (AirPrint)</strong>.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
