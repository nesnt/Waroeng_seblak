import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  Zap,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Layers,
  HelpCircle,
  Activity,
  MessageSquare
} from 'lucide-react';
import { fetchTokenUsage, TokenUsageData } from '../services/aiTokenService';
import { formatIndonesianDate } from '../utils/formatters';

export const AiTokenUsageView: React.FC = () => {
  const [data, setData] = useState<TokenUsageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTokenUsage();
      setData(result);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load token usage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto refresh setiap 30 detik
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const todayTokens = data?.today.totalTokens ?? 0;
  const remainingTokens = data?.today.remainingTokens ?? 1000000;
  const totalQuotaTokens = data?.dailyQuotaTokens ?? 1000000;
  const percentUsed = data?.today.percentTokensUsed ?? 0;
  const percentRemaining = Math.max(0, 100 - percentUsed);

  const todayRequests = data?.today.requestsCount ?? 0;
  const remainingRequests = data?.today.remainingRequests ?? 1500;
  const totalQuotaRequests = data?.dailyQuotaRequests ?? 1500;
  const percentRequestsUsed = data?.today.percentRequestsUsed ?? 0;

  const isConnected = data?.whatsapp.isConnected ?? false;
  const activeModel = data?.model || 'gemini-3.1-flash-lite';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-600/10 text-orange-600 dark:text-orange-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Monitoring Kuota & Token AI
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Gemini 3.1 Flash Lite
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                Pantau tingkat penggunaan token dan sisa kuota harian bot WhatsApp Waroeng Seblak 48 secara real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Refresh & Status Bot */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Status Badge Bot */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <span>{isConnected ? 'Bot WhatsApp Aktif' : 'Bot Standby'}</span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            title="Muat Ulang Statistik"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid 4 Kartu Metrik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kartu 1: Sisa Kuota Token Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Sisa Kuota Token
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                {remainingTokens.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold text-stone-400">/ 1 Juta</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{percentRemaining.toFixed(1)}% kuota masih tersedia</span>
            </p>
          </div>

          {/* Progress Bar Kuota */}
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-1">
              <span>Terpakai: {todayTokens.toLocaleString('id-ID')}</span>
              <span>{percentUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed < 70
                    ? 'bg-emerald-500'
                    : percentUsed < 90
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, percentUsed))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Kartu 2: Permintaan Hari Ini (RPD Quota) */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Request Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                {todayRequests.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold text-stone-400">/ 1.500 RPD</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Sisa: <strong className="text-stone-800 dark:text-stone-200">{remainingRequests.toLocaleString('id-ID')}</strong> request lagi
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-1">
              <span>Batas Harian (RPD)</span>
              <span>{percentRequestsUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, percentRequestsUsed))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Kartu 3: Rincian Token Masuk & Keluar */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Breakdown Token
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Prompt (Input):
              </span>
              <span className="font-bold font-mono text-stone-800 dark:text-stone-200">
                {(data?.today.promptTokens ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Output (Balasan):
              </span>
              <span className="font-bold font-mono text-stone-800 dark:text-stone-200">
                {(data?.today.candidatesTokens ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px]">
            <span className="text-stone-400 font-semibold">Total Seluruh Waktu:</span>
            <span className="font-bold text-stone-700 dark:text-stone-300 font-mono">
              {(data?.allTime.totalTokens ?? 0).toLocaleString('id-ID')} token
            </span>
          </div>
        </div>

        {/* Kartu 4: Estimasi Biaya & Model AI */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Estimasi Biaya API
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              Rp 0,-
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              100% Gratis di <strong>Google AI Studio Free Tier</strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px]">
            <span className="text-stone-400 font-semibold">Model Aktif:</span>
            <span className="font-bold text-orange-600 dark:text-orange-400 font-mono truncate max-w-[130px]">
              {activeModel}
            </span>
          </div>
        </div>
      </div>

      {/* Informasi Batasan Kuota Google AI Studio (Spesifikasi Teknis) */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent dark:from-orange-950/30 dark:via-amber-950/20 border border-orange-200/80 dark:border-orange-800/60 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-600 text-white shadow-xs shrink-0 mt-0.5">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                Spesifikasi Kuota Google Gemini 3.1 Flash Lite (Free Tier)
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Model ini sangat hemat token dan dirancang untuk latensi rendah pada agen operasional WhatsApp UMKM.
              </p>
            </div>
          </div>

          {/* Badge Ringkasan Kuota */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto text-xs">
            <div className="bg-white/80 dark:bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 font-bold text-stone-700 dark:text-stone-300">
              ⚡ 15 RPM <span className="text-stone-400 font-normal">(Req / Menit)</span>
            </div>
            <div className="bg-white/80 dark:bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 font-bold text-stone-700 dark:text-stone-300">
              📅 1.500 RPD <span className="text-stone-400 font-normal">(Req / Hari)</span>
            </div>
            <div className="bg-white/80 dark:bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 font-bold text-stone-700 dark:text-stone-300">
              🔄 Reset: 07:00 WIB
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Interaksi & Konsumsi Token Terbaru */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
              Riwayat Interaksi & Konsumsi Token Terbaru
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-medium">
            Terakhir di-refresh: {lastRefreshed.toLocaleTimeString('id-ID')}
          </span>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengirim & Role</th>
                <th className="py-3 px-4">Pesan Masuk</th>
                <th className="py-3 px-4">Balasan AI</th>
                <th className="py-3 px-4 text-right">Token (In / Out)</th>
                <th className="py-3 px-4 text-right">Total Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {!data?.recentLogs || data.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 italic">
                    Belum ada riwayat interaksi obrolan WhatsApp yang tercatat hari ini.
                  </td>
                </tr>
              ) : (
                data.recentLogs.map((log) => {
                  const timeFormatted = new Date(log.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition"
                    >
                      {/* Waktu */}
                      <td className="py-3.5 px-4 font-mono text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {timeFormatted}
                      </td>

                      {/* Pengirim & Role */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {log.senderName}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            log.senderRole === 'OWNER'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {log.senderRole}
                        </span>
                      </td>

                      {/* Pesan Masuk */}
                      <td className="py-3.5 px-4 font-medium text-stone-800 dark:text-stone-200 max-w-xs truncate">
                        "{log.incomingMessage}"
                      </td>

                      {/* Balasan AI */}
                      <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 max-w-xs truncate">
                        {log.aiResponseSnippet}
                      </td>

                      {/* Token Breakdown (In / Out) */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-stone-500 dark:text-stone-400">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{log.promptTokens}</span>
                        {' / '}
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">{log.candidatesTokens}</span>
                      </td>

                      {/* Total Token */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                          {log.totalTokens}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
