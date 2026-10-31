import React, { useState, useMemo } from 'react';
import { Transaction, MenuItem } from '../types';
import { formatRupiah, exportToCsv } from '../utils/formatters';
import { ChartComponent } from './ChartComponent';
import {
  Download,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Filter,
} from 'lucide-react';

interface SalesReportViewProps {
  transactions: Transaction[];
  menuItems: MenuItem[];
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const SalesReportView: React.FC<SalesReportViewProps> = ({ transactions }) => {
  // Tab utama: Harian / Mingguan / Bulanan
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // State sub-filter: Dinamis default ke tanggal hari ini
  const now = new Date();
  const [selectedDay, setSelectedDay] = useState<number>(() => now.getDate());
  const [selectedWeek, setSelectedWeek] = useState<number>(() => Math.min(4, Math.ceil(now.getDate() / 7)));
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getFullYear());

  // Hitung jumlah hari dalam bulan & tahun yang dipilih
  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Pastikan selectedDay tidak melebihi jumlah hari di bulan baru saat ganti bulan
  const safeSelectedDay = Math.min(selectedDay, daysInSelectedMonth);

  // Rentang tanggal per minggu dalam 1 bulan
  const getWeekDateRange = (weekNum: number, totalDays: number): [number, number] => {
    if (weekNum === 1) return [1, 7];
    if (weekNum === 2) return [8, 14];
    if (weekNum === 3) return [15, 21];
    return [22, totalDays];
  };

  // Judul deskripsi periode aktif
  const activePeriodLabel = useMemo(() => {
    if (reportPeriod === 'daily') {
      return `${safeSelectedDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (reportPeriod === 'weekly') {
      const [startD, endD] = getWeekDateRange(selectedWeek, daysInSelectedMonth);
      return `Minggu ke-${selectedWeek} (${startD} - ${endD} ${MONTH_NAMES[selectedMonth]} ${selectedYear})`;
    }
    return `Bulan ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  }, [reportPeriod, safeSelectedDay, selectedWeek, selectedMonth, selectedYear, daysInSelectedMonth]);

  // Pemrosesan data transaksi berdasarkan filter yang dipilih
  const periodData = useMemo(() => {
    let currentTxs: Transaction[] = [];
    let prevTxs: Transaction[] = [];
    let chartLabels: string[] = [];
    let chartValues: number[] = [];
    let breakdownRows: { label: string; count: number; revenue: number; avg: number }[] = [];

    if (reportPeriod === 'daily') {
      // HARIAN: Omset dalam 1 hari pada Tanggal & Bulan yang dipilih
      currentTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === selectedYear &&
          d.getMonth() === selectedMonth &&
          d.getDate() === safeSelectedDay
        );
      });

      // Pembanding: 1 hari sebelumnya
      const prevDate = new Date(selectedYear, selectedMonth, safeSelectedDay - 1);
      prevTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === prevDate.getFullYear() &&
          d.getMonth() === prevDate.getMonth() &&
          d.getDate() === prevDate.getDate()
        );
      });

      // Grafik & Rincian: Cukup 1 batang berisi total omset pada hari tersebut
      const dayLabel = `${safeSelectedDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      const dayRev = currentTxs.reduce((sum, t) => sum + t.totalAmount, 0);

      chartLabels.push(dayLabel);
      chartValues.push(dayRev);
      breakdownRows.push({
        label: dayLabel,
        count: currentTxs.length,
        revenue: dayRev,
        avg: currentTxs.length > 0 ? Math.round(dayRev / currentTxs.length) : 0,
      });
    } else if (reportPeriod === 'weekly') {
      // MINGGUAN: Omset pada Minggu ke-X, Bulan & Tahun yang dipilih
      const [startDay, endDay] = getWeekDateRange(selectedWeek, daysInSelectedMonth);

      currentTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        const dateNum = d.getDate();
        return (
          d.getFullYear() === selectedYear &&
          d.getMonth() === selectedMonth &&
          dateNum >= startDay &&
          dateNum <= endDay
        );
      });

      // Pembanding: Minggu sebelumnya
      let prevStart = new Date(selectedYear, selectedMonth, startDay - 7);
      let prevEnd = new Date(selectedYear, selectedMonth, startDay - 1, 23, 59, 59);
      prevTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= prevStart && d <= prevEnd;
      });

      // Grafik & Rincian: Omset per Tanggal di dalam Minggu tersebut
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
        const dObj = new Date(selectedYear, selectedMonth, dayNum);
        const dayName = dayNames[dObj.getDay()];
        const shortMonth = MONTH_NAMES[selectedMonth].substring(0, 3);
        const label = `${dayName}, ${dayNum} ${shortMonth}`;

        const dayTxs = currentTxs.filter((t) => new Date(t.date).getDate() === dayNum);
        const rev = dayTxs.reduce((sum, t) => sum + t.totalAmount, 0);

        chartLabels.push(`${dayNum} ${shortMonth}`);
        chartValues.push(rev);
        breakdownRows.push({
          label: `${label} ${selectedYear}`,
          count: dayTxs.length,
          revenue: rev,
          avg: dayTxs.length > 0 ? Math.round(rev / dayTxs.length) : 0,
        });
      }
    } else {
      // BULANAN: Omset pada Bulan & Tahun yang dipilih
      currentTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });

      // Pembanding: Bulan sebelumnya
      const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
      const prevMonthYear = prevMonthDate.getFullYear();
      const prevMonthIdx = prevMonthDate.getMonth();

      prevTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthIdx;
      });

      // Grafik & Rincian: Omset per Minggu (Minggu ke-1 s/d Minggu ke-4) dalam Bulan tersebut
      for (let w = 1; w <= 4; w++) {
        const [wStart, wEnd] = getWeekDateRange(w, daysInSelectedMonth);
        const shortMonth = MONTH_NAMES[selectedMonth].substring(0, 3);
        const wLabel = `Minggu ke-${w} (${wStart}-${wEnd} ${shortMonth})`;

        const wTxs = currentTxs.filter((t) => {
          const dNum = new Date(t.date).getDate();
          return dNum >= wStart && dNum <= wEnd;
        });
        const rev = wTxs.reduce((sum, t) => sum + t.totalAmount, 0);

        chartLabels.push(`Minggu ke-${w}`);
        chartValues.push(rev);
        breakdownRows.push({
          label: wLabel,
          count: wTxs.length,
          revenue: rev,
          avg: wTxs.length > 0 ? Math.round(rev / wTxs.length) : 0,
        });
      }
    }

    return {
      currentTxs,
      prevTxs,
      chartLabels,
      chartValues,
      breakdownRows,
    };
  }, [transactions, reportPeriod, safeSelectedDay, selectedWeek, selectedMonth, selectedYear, daysInSelectedMonth]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return periodData.currentTxs.reduce((sum, t) => sum + t.totalAmount, 0);
  }, [periodData.currentTxs]);

  const prevRevenue = useMemo(() => {
    return periodData.prevTxs.reduce((sum, t) => sum + t.totalAmount, 0);
  }, [periodData.prevTxs]);

  const revenueGrowth = useMemo(() => {
    if (prevRevenue === 0) return totalRevenue > 0 ? 100 : 0;
    return Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
  }, [totalRevenue, prevRevenue]);

  const totalTransactionsCount = periodData.currentTxs.length;
  const prevTransactionsCount = periodData.prevTxs.length;
  const txGrowth = useMemo(() => {
    if (prevTransactionsCount === 0) return totalTransactionsCount > 0 ? 100 : 0;
    return Math.round(
      ((totalTransactionsCount - prevTransactionsCount) / prevTransactionsCount) * 100
    );
  }, [totalTransactionsCount, prevTransactionsCount]);

  // Menu terlaris periode
  const topSellingMenu = useMemo(() => {
    const map: { [id: string]: { name: string; qty: number; rev: number } } = {};
    periodData.currentTxs.forEach((t) => {
      t.items.forEach((i) => {
        if (!map[i.menuItemId]) {
          map[i.menuItemId] = { name: i.menuItemName, qty: 0, rev: 0 };
        }
        map[i.menuItemId].qty += i.quantity;
        map[i.menuItemId].rev += i.subtotal;
      });
    });

    const sorted = Object.values(map).sort((a, b) => b.qty - a.qty);
    return sorted[0] || { name: 'Belum ada penjualan', qty: 0, rev: 0 };
  }, [periodData.currentTxs]);

  // Jam paling ramai (Peak Hour)
  const peakHourInfo = useMemo(() => {
    if (periodData.currentTxs.length === 0) {
      return {
        timeSlot: '-',
        count: 0,
        periodLabel: 'Tidak ada transaksi pada periode ini',
      };
    }

    const hourCounts: { [hour: number]: number } = {};
    periodData.currentTxs.forEach((t) => {
      const h = new Date(t.date).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    let maxHour = 19;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hStr, cnt]) => {
      const cntNum = Number(cnt);
      if (cntNum > maxCount) {
        maxCount = cntNum;
        maxHour = Number(hStr);
      }
    });

    const startH = String(maxHour).padStart(2, '0');
    const endH = String((maxHour + 1) % 24).padStart(2, '0');
    return {
      timeSlot: `${startH}:00 - ${endH}:00`,
      count: maxCount,
      periodLabel: maxHour >= 17 ? 'Malam (Waktu Makan Malam)' : 'Siang (Waktu Istirahat)',
    };
  }, [periodData.currentTxs]);

  // Chart data
  const chartData = useMemo(() => {
    return {
      labels: periodData.chartLabels,
      datasets: [
        {
          label: 'Total Omset (Rp)',
          data: periodData.chartValues,
          backgroundColor: '#ea580c',
          borderColor: '#c2410c',
          borderRadius: 8,
          borderWidth: 1,
          maxBarThickness: 90,
        },
      ],
    };
  }, [periodData]);

  // Export report to CSV
  const handleExportReportCsv = () => {
    const headers = [
      'Periode / Waktu',
      'Jumlah Transaksi (Nota)',
      'Total Omset (Rp)',
      'Rata-rata per Nota (Rp)',
    ];

    const rows = periodData.breakdownRows.map((r) => [
      r.label,
      r.count,
      r.revenue,
      r.avg,
    ]);

    exportToCsv(
      `Laporan_Omset_Seblak48_${reportPeriod}_${activePeriodLabel.replace(/\s+/g, '_')}`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header View & Tab Utama */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between w-full gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              Laporan Analisis Omset
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Menampilkan laporan untuk: <strong className="text-orange-600 dark:text-orange-400">{activePeriodLabel}</strong>
            </p>
          </div>

          <button
            onClick={handleExportReportCsv}
            title="Ekspor CSV"
            aria-label="Ekspor CSV"
            className="ml-auto p-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 shadow-sm active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Periode */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="bg-white dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center shadow-xs">
            {[
              { id: 'daily', label: 'Harian' },
              { id: 'weekly', label: 'Mingguan' },
              { id: 'monthly', label: 'Bulanan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportPeriod(tab.id as 'daily' | 'weekly' | 'monthly')}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  reportPeriod === tab.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL SUB-FILTER DINAMIS SESUAI PILIHAN TAB */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
            <Filter className="w-4 h-4 text-orange-600" />
            <span>
              {reportPeriod === 'daily' && 'Pilih Tanggal & Bulan Laporan Harian:'}
              {reportPeriod === 'weekly' && 'Pilih Minggu, Bulan & Tahun Laporan Mingguan:'}
              {reportPeriod === 'monthly' && 'Pilih Bulan & Tahun Laporan Bulanan:'}
            </span>
          </div>

          {/* 1. Opsi Sub-Filter HARIAN: Tanggal Berapa & Bulan Apa */}
          {reportPeriod === 'daily' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Tanggal:
                </label>
                <select
                  value={safeSelectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="w-full sm:w-36 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Tanggal {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Bulan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-44 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 2. Opsi Sub-Filter MINGGUAN: Minggu ke Berapa, Bulan Apa & Tahun Berapa */}
          {reportPeriod === 'weekly' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Minggu:
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full sm:w-52 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  <option value={1}>Minggu ke-1 (Tgl 1 - 7)</option>
                  <option value={2}>Minggu ke-2 (Tgl 8 - 14)</option>
                  <option value={3}>Minggu ke-3 (Tgl 15 - 21)</option>
                  <option value={4}>Minggu ke-4 (Tgl 22 - {daysInSelectedMonth})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Bulan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-40 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Tahun:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full sm:w-32 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {AVAILABLE_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 3. Opsi Sub-Filter BULANAN: Bulan Apa & Tahun Berapa */}
          {reportPeriod === 'monthly' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Bulan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-44 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                  Tahun:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full sm:w-36 text-xs font-bold py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-orange-500"
                >
                  {AVAILABLE_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Kartu Metrik Periode - 2 Kolom Berdampingan di Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Omset Periode */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">
            {reportPeriod === 'daily'
              ? 'Total Omset Hari Ini'
              : reportPeriod === 'weekly'
              ? 'Total Omset Minggu Ini'
              : 'Total Omset Bulan Ini'}
          </span>
          <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100 truncate">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="flex items-center flex-wrap gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
            {revenueGrowth >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />+{revenueGrowth}%
              </span>
            ) : (
              <span className="text-red-500 font-bold flex items-center">
                <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{revenueGrowth}%
              </span>
            )}
            <span className="text-stone-400 truncate">
              vs lalu ({formatRupiah(prevRevenue)})
            </span>
          </div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">
            Jumlah Transaksi
          </span>
          <div className="text-base sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {totalTransactionsCount}{' '}
            <span className="text-xs sm:text-sm font-semibold text-stone-500">Nota</span>
          </div>
          <div className="flex items-center flex-wrap gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
            {txGrowth >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />+{txGrowth}%
              </span>
            ) : (
              <span className="text-red-500 font-bold flex items-center">
                <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{txGrowth}%
              </span>
            )}
            <span className="text-stone-400 truncate">
              vs lalu ({prevTransactionsCount} nota)
            </span>
          </div>
        </div>

        {/* Menu Terlaris Periode */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">
            Menu Terlaris
          </span>
          <div className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 truncate">
            {topSellingMenu.name}
          </div>
          <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-bold mt-1 truncate">
            {topSellingMenu.qty} porsi · {formatRupiah(topSellingMenu.rev)}
          </p>
        </div>

        {/* Jam Paling Ramai */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">
            Jam Paling Ramai
          </span>
          <div className="text-sm sm:text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5 sm:gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
            <span>{peakHourInfo.timeSlot}</span>
          </div>
          <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
            {peakHourInfo.count > 0
              ? `${peakHourInfo.periodLabel} (${peakHourInfo.count} pesanan)`
              : peakHourInfo.periodLabel}
          </p>
        </div>
      </div>

      {/* Grafik Batang Omset Periode */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              {reportPeriod === 'daily' && `Grafik Omset Harian (${activePeriodLabel})`}
              {reportPeriod === 'weekly' && `Grafik Omset Mingguan (${activePeriodLabel})`}
              {reportPeriod === 'monthly' && `Grafik Omset Bulanan (${activePeriodLabel})`}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {reportPeriod === 'daily' &&
                `Total pemasukan warung pada tanggal ${activePeriodLabel}`}
              {reportPeriod === 'weekly' &&
                'Perbandingan omset dari hari ke hari pada minggu yang dipilih'}
              {reportPeriod === 'monthly' &&
                'Perbandingan omset dari minggu ke-1 hingga minggu ke-4 pada bulan yang dipilih'}
            </p>
          </div>
        </div>

        <ChartComponent type="bar" data={chartData} height={280} />
      </div>

      {/* Tabel Rincian Breakdown Periode */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
            Rincian Pembukuan — {activePeriodLabel}
          </span>
          <span className="text-xs font-semibold text-stone-500">
            Total: <strong className="text-orange-600">{formatRupiah(totalRevenue)}</strong>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-3 px-4">
                  {reportPeriod === 'daily'
                    ? 'Tanggal'
                    : reportPeriod === 'weekly'
                    ? 'Hari & Tanggal'
                    : 'Minggu Ke-'}
                </th>
                <th className="py-3 px-4">Jumlah Transaksi</th>
                <th className="py-3 px-4">Total Omset (Rp)</th>
                <th className="py-3 px-4">Rata-rata per Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {periodData.breakdownRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                    {row.label}
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-700 dark:text-stone-300">
                    {row.count} Nota
                  </td>
                  <td className="py-3 px-4 font-extrabold text-orange-600 dark:text-orange-400">
                    {formatRupiah(row.revenue)}
                  </td>
                  <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                    {formatRupiah(row.avg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
