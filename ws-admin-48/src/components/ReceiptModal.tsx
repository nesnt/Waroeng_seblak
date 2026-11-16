import React from 'react';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { Printer, X, CheckCircle2, Info } from 'lucide-react';

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
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                Struk Transaksi Penjualan
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
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

        {/* Info Petunjuk Cetak */}
        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Printer Bluetooth/USB: Gunakan kertas thermal 58mm untuk hasil terbaik.</span>
        </div>

        {/* Struk Content (Format Standar Thermal 58mm) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex justify-center bg-stone-100 dark:bg-stone-950/40">
          <div
            id="printable-receipt"
            className="w-full max-w-[310px] bg-white dark:bg-stone-950 p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 font-mono text-[11px] text-stone-900 dark:text-stone-100 shadow-sm space-y-2.5"
          >
            {/* Header Toko */}
            <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-stone-400 dark:border-stone-700 print:border-black">
              <h4 className="font-black text-sm uppercase tracking-wider text-stone-900 dark:text-stone-100 print:text-black">
                {settings.storeName || 'WAROENG SEBLAK 48'}
              </h4>
              {settings.slogan && (
                <p className="text-[10px] text-stone-600 dark:text-stone-400 print:text-black">
                  {settings.slogan}
                </p>
              )}
              {settings.address && (
                <p className="text-[10px] text-stone-600 dark:text-stone-400 print:text-black leading-tight">
                  {settings.address}
                </p>
              )}
              {settings.phone && (
                <p className="text-[10px] text-stone-600 dark:text-stone-400 print:text-black">
                  WA: {settings.phone}
                </p>
              )}
            </div>

            {/* Info Transaksi */}
            <div className="space-y-0.5 py-1 border-b border-dashed border-stone-400 dark:border-stone-700 print:border-black text-[10px]">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400 print:text-black">No. Nota:</span>
                <span className="font-bold print:text-black">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400 print:text-black">Waktu:</span>
                <span className="print:text-black">{formatIndonesianDate(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400 print:text-black">Pelanggan:</span>
                <span className="font-semibold print:text-black break-words text-right max-w-[170px]">
                  {transaction.customerName || 'Pelanggan Umum'}
                </span>
              </div>
              {transaction.notes && (
                <div className="pt-0.5 text-stone-600 dark:text-stone-400 print:text-black text-[9.5px] italic leading-tight break-words">
                  {transaction.notes}
                </div>
              )}
            </div>

            {/* Daftar Item */}
            <div className="space-y-2 py-1.5 border-b border-dashed border-stone-400 dark:border-stone-700 print:border-black">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5 leading-tight">
                  <div className="flex justify-between items-start gap-1 font-bold text-[11px]">
                    <span className="break-words flex-1 print:text-black">
                      {item.menuItemName} x{item.quantity}
                    </span>
                    <span className="shrink-0 print:text-black">{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.levelPedas > 0 && (
                    <div className="text-[9.5px] text-orange-600 dark:text-orange-400 print:text-black pl-1.5 font-medium">
                      Pedas: Level {item.levelPedas}
                    </div>
                  )}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="text-[9.5px] text-stone-600 dark:text-stone-400 print:text-black pl-1.5 leading-tight">
                      + Topping: {item.toppings.map((t) => t.name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[9.5px] text-stone-500 dark:text-stone-400 print:text-black italic pl-1.5">
                      Catatan: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total & Pembayaran */}
            <div className="space-y-1 pt-1.5 text-[10.5px]">
              <div className="flex justify-between font-black text-xs text-stone-900 dark:text-stone-100 print:text-black">
                <span>TOTAL:</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-700 dark:text-stone-300 print:text-black">
                <span>Metode Bayar:</span>
                <span className="font-semibold">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === 'Tunai' && (
                <>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400 print:text-black">
                    <span>Tunai:</span>
                    <span>{formatRupiah(transaction.cashReceived || transaction.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(transaction.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Struk */}
            <div className="text-center pt-2.5 border-t border-dashed border-stone-400 dark:border-stone-700 print:border-black text-[9.5px] text-stone-600 dark:text-stone-400 print:text-black space-y-0.5 pb-2 print:pb-6">
              <p className="font-bold text-stone-800 dark:text-stone-200 print:text-black">
                Hatur Nuhun! Wilujeng Tuang!
              </p>
              <p>Stok bahan telah otomatis terpotong dari resep.</p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-98 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk Thermal (58mm)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
