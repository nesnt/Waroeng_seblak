import React from 'react';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { Printer, X, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-stone-900 dark:text-stone-100">
              Transaksi Berhasil
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Struk Content (Bisa diprint thermal 80mm) */}
        <div className="p-6 overflow-y-auto">
          <div
            id="printable-receipt"
            className="bg-stone-50 dark:bg-stone-950 p-5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 font-mono text-xs text-stone-800 dark:text-stone-200 space-y-3"
          >
            {/* Header Toko */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-300 dark:border-stone-700">
              <h4 className="font-extrabold text-base uppercase tracking-wider text-stone-900 dark:text-stone-100">
                {settings.storeName}
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">{settings.slogan}</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">{settings.address}</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Telp: {settings.phone}</p>
            </div>

            {/* Info Transaksi */}
            <div className="space-y-1 py-1 border-b border-dashed border-stone-300 dark:border-stone-700 text-[11px]">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatIndonesianDate(transaction.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span>{transaction.customerName || 'Pelanggan Umum'}</span>
              </div>
              {transaction.notes && (
                <div className="flex justify-between">
                  <span>Ket:</span>
                  <span className="italic">{transaction.notes}</span>
                </div>
              )}
            </div>

            {/* Daftar Item */}
            <div className="space-y-2 py-2 border-b border-dashed border-stone-300 dark:border-stone-700">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span>
                      {item.menuItemName} x{item.quantity}
                    </span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.levelPedas > 0 && (
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 pl-2">
                      Level Pedas: Level {item.levelPedas}
                    </div>
                  )}
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 pl-2">
                      + Topping: {item.toppings.map((t) => t.name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 italic pl-2">
                      Catatan: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total & Pembayaran */}
            <div className="space-y-1.5 pt-2 text-[11px]">
              <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100">
                <span>TOTAL:</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode Bayar:</span>
                <span className="font-semibold">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === 'Tunai' && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima:</span>
                    <span>{formatRupiah(transaction.cashReceived || transaction.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(transaction.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Struk */}
            <div className="text-center pt-3 border-t border-dashed border-stone-300 dark:border-stone-700 text-[10px] text-stone-500 dark:text-stone-400 space-y-1">
              <p className="font-semibold text-stone-700 dark:text-stone-300">
                Hatur Nuhun! Wilujeng Tuang!
              </p>
              <p>Stok bahan telah otomatis terpotong dari resep.</p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="p-4 bg-stone-50 dark:bg-stone-950/50 border-t border-stone-200 dark:border-stone-800 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md shadow-orange-600/20 active:scale-98 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
