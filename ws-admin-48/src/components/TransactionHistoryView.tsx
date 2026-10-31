import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { formatRupiah, formatIndonesianDate, exportToCsv } from '../utils/formatters';
import {
  Search,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Eye,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  onOpenReceipt: (transaction: Transaction) => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('Semua');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Batas tanggal dari tahun 2020 sampai hari ini (dinamis)
  const minDateStr = '2020-01-01';
  const maxDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Selected for detail drawer / modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search
      const matchSearch =
        tx.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.items.some((i) => i.menuItemName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Payment
      const matchPayment = selectedPayment === 'Semua' || tx.paymentMethod === selectedPayment;

      // Date Filter: jika pengguna memilih tanggal tertentu, filter persis tanggal tersebut
      const txDateStr = tx.date ? tx.date.split('T')[0] : '';

      let matchDate = true;
      if (selectedDate) {
        matchDate = txDateStr === selectedDate;
      }

      return matchSearch && matchPayment && matchDate;
    });
  }, [transactions, searchQuery, selectedDate, selectedPayment]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'No. Nota / ID',
      'Tanggal & Jam',
      'Nama Pelanggan',
      'Daftar Menu / Item',
      'Total Nominal (Rp)',
      'Metode Bayar',
      'Status',
      'Catatan',
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.invoiceNumber,
      formatIndonesianDate(tx.date),
      tx.customerName || 'Umum',
      tx.items
        .map((i) => `${i.menuItemName} (x${i.quantity}${i.levelPedas ? `, Lvl ${i.levelPedas}` : ''})`)
        .join(' | '),
      tx.totalAmount,
      tx.paymentMethod,
      tx.status,
      tx.notes || '-',
    ]);

    exportToCsv(`Riwayat_Transaksi_Seblak48_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Riwayat Transaksi Penjualan
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Daftar lengkap nota pembayaran, filter tanggal (2020 s/d hari ini), dan ekspor pembukuan.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs sm:text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Ekspor ke CSV (Excel)
        </button>
      </div>

      {/* Filter & Pencarian Box */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Nota, Pelanggan, Menu..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs sm:text-sm pl-10 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Pilihan Tanggal Spesifik (2020-01-01 s/d Hari Ini) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 whitespace-nowrap flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Tanggal:
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setCurrentPage(1);
                  }}
                  title="Tampilkan Semua Tanggal"
                  className="ml-1.5 p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-red-500 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 whitespace-nowrap">Metode:</span>
            <select
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
            >
              <option value="Semua">Semua Metode Bayar</option>
              <option value="Tunai">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>
        </div>

        {/* Total Hasil Info */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
          <span>
            Menampilkan <strong>{filteredTransactions.length}</strong> transaksi
          </span>
          <span>
            Total Nilai:{' '}
            <strong className="text-orange-600 dark:text-orange-400">
              {formatRupiah(filteredTransactions.reduce((s, t) => s + t.totalAmount, 0))}
            </strong>
          </span>
        </div>
      </div>

      {/* Tabel Riwayat (Desktop) & Cards (Mobile) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {paginatedTransactions.length === 0 ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <Receipt className="w-12 h-12 mx-auto stroke-[1.5]" />
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
              Tidak ada riwayat transaksi yang cocok dengan filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">No. Nota</th>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Menu / Item</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {paginatedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                        {tx.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 text-xs">
                        {formatIndonesianDate(tx.date)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-800 dark:text-stone-200">
                        {tx.customerName || 'Umum'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-stone-600 dark:text-stone-300 text-xs">
                        {tx.items
                          .map((i) => `${i.menuItemName} (${i.quantity})`)
                          .join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-black text-stone-900 dark:text-stone-100">
                        {formatRupiah(tx.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {tx.paymentMethod === 'Tunai' && <Banknote className="w-3 h-3 text-emerald-600" />}
                          {tx.paymentMethod === 'QRIS' && <QrCode className="w-3 h-3 text-orange-600" />}
                          {tx.paymentMethod === 'Transfer' && <CreditCard className="w-3 h-3 text-blue-600" />}
                          <span>{tx.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReceipt(tx);
                          }}
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold transition cursor-pointer"
                          title="Lihat / Cetak Struk"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800 p-2">
              {paginatedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-3.5 space-y-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 rounded-xl transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-sm text-stone-900 dark:text-stone-100">
                        {tx.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {formatIndonesianDate(tx.date)} · {tx.customerName || 'Umum'}
                      </div>
                    </div>
                    <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                      {formatRupiah(tx.totalAmount)}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 dark:text-stone-400">
                    {tx.items.map((i) => `${i.menuItemName} x${i.quantity}`).join(', ')}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                      {tx.paymentMethod}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReceipt(tx);
                      }}
                      className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Struk
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        (p >= currentPage - 1 && p <= currentPage + 1)
                    )
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-stone-400 text-xs">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentPage === p
                              ? 'bg-orange-600 text-white'
                              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedTx && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-black text-base text-stone-900 dark:text-stone-100">
                  Detail Transaksi {selectedTx.invoiceNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  {formatIndonesianDate(selectedTx.date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Info Pelanggan & Catatan */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200/80 dark:border-stone-800 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Nama Pelanggan:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {selectedTx.customerName || 'Pelanggan Umum'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Metode Bayar:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {selectedTx.paymentMethod}
                  </span>
                </div>
                {selectedTx.notes && (
                  <div className="col-span-2">
                    <span className="text-stone-400 block text-[10px]">Catatan Meja / Bawa:</span>
                    <span className="italic">{selectedTx.notes}</span>
                  </div>
                )}
              </div>

              {/* Rincian Item Pesanan */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Daftar Pesanan
                </h4>
                <div className="space-y-2">
                  {selectedTx.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 space-y-1"
                    >
                      <div className="flex justify-between items-start text-xs font-bold text-stone-900 dark:text-stone-100">
                        <span>
                          {item.menuItemName} x{item.quantity}
                        </span>
                        <span>{formatRupiah(item.subtotal)}</span>
                      </div>
                      {item.levelPedas > 0 && (
                        <div className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Pedas: Level {item.levelPedas}
                        </div>
                      )}
                      {item.toppings.length > 0 && (
                        <div className="text-[11px] text-stone-500">
                          Topping: {item.toppings.map((t) => t.name).join(', ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-stone-400 italic">
                          Catatan: &ldquo;{item.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rincian Bayar */}
              <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(selectedTx.totalAmount)}</span>
                </div>
                {selectedTx.paymentMethod === 'Tunai' && (
                  <>
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Uang Tunai:</span>
                      <span>{formatRupiah(selectedTx.cashReceived || selectedTx.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(selectedTx.change || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex gap-2">
              <button
                onClick={() => {
                  onOpenReceipt(selectedTx);
                  setSelectedTx(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk Transaksi
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
