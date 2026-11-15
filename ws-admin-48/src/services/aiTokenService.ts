import { supabase } from '../lib/supabase';

export interface TokenUsageData {
  success: boolean;
  whatsapp: {
    isConnected: boolean;
    connectedUser: string | null;
  };
  model: string;
  dailyQuotaTokens: number;
  dailyQuotaRequests: number;
  today: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    requestsCount: number;
    remainingTokens: number;
    remainingRequests: number;
    percentTokensUsed: number;
    percentRequestsUsed: number;
  };
  allTime: {
    totalTokens: number;
    totalRequests: number;
  };
  recentLogs: Array<{
    id: string;
    createdAt: string;
    senderName: string;
    senderRole: string;
    incomingMessage: string;
    aiResponseSnippet: string;
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    model: string;
  }>;
}

/**
 * Mengambil data pemakaian token dari bot server lokal atau fallback Supabase
 */
export const fetchTokenUsage = async (): Promise<TokenUsageData> => {
  // 1. Coba ambil dari REST API lokal bot (http://localhost:5000)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('http://localhost:5000/api/token-usage', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.today) {
        return data as TokenUsageData;
      }
    }
  } catch (err) {
    // Abaikan dan lanjut ke fallback Supabase jika server lokal tidak terjangkau
  }

  // 2. Fallback: Query langsung dari Supabase wa_chat_logs
  return await fetchTokenUsageFromSupabase();
};

/**
 * Fallback query audit log dari Supabase wa_chat_logs
 */
export const fetchTokenUsageFromSupabase = async (): Promise<TokenUsageData> => {
  const DAILY_QUOTA_TOKENS = 1000000;
  const DAILY_QUOTA_REQUESTS = 1500;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const { data: logs, error } = await supabase
      .from('wa_chat_logs')
      .select('id, sender_name, sender_role, incoming_message, ai_response, tool_calls_executed, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    let todayPrompt = 0;
    let todayCandidates = 0;
    let todayTotal = 0;
    let todayRequests = 0;

    let allTimeTotal = 0;
    const allTimeRequests = (logs || []).length;

    const recentLogs = (logs || []).slice(0, 15).map((log: any) => {
      const meta = log.tool_calls_executed?.tokenUsage || {};
      const prompt = Number(meta.promptTokens) || Math.ceil((log.incoming_message?.length || 10) / 4);
      const candidates = Number(meta.candidatesTokens) || Math.ceil((log.ai_response?.length || 20) / 4);
      const total = Number(meta.totalTokens) || (prompt + candidates);
      const model = meta.model || 'gemini-3.1-flash-lite';

      return {
        id: log.id,
        createdAt: log.created_at,
        senderName: log.sender_name || 'Pengguna',
        senderRole: log.sender_role || 'CUSTOMER',
        incomingMessage: log.incoming_message || '',
        aiResponseSnippet: (log.ai_response || '').length > 80 ? `${log.ai_response.slice(0, 80)}...` : log.ai_response,
        promptTokens: prompt,
        candidatesTokens: candidates,
        totalTokens: total,
        model
      };
    });

    for (const log of logs || []) {
      const isToday = log.created_at?.startsWith(todayStr);
      const meta = log.tool_calls_executed?.tokenUsage || {};
      const prompt = Number(meta.promptTokens) || Math.ceil((log.incoming_message?.length || 10) / 4);
      const candidates = Number(meta.candidatesTokens) || Math.ceil((log.ai_response?.length || 20) / 4);
      const total = Number(meta.totalTokens) || (prompt + candidates);

      allTimeTotal += total;

      if (isToday) {
        todayPrompt += prompt;
        todayCandidates += candidates;
        todayTotal += total;
        todayRequests += 1;
      }
    }

    const remainingTokens = Math.max(0, DAILY_QUOTA_TOKENS - todayTotal);
    const remainingRequests = Math.max(0, DAILY_QUOTA_REQUESTS - todayRequests);
    const percentTokensUsed = Number(((todayTotal / DAILY_QUOTA_TOKENS) * 100).toFixed(2));
    const percentRequestsUsed = Number(((todayRequests / DAILY_QUOTA_REQUESTS) * 100).toFixed(2));

    return {
      success: true,
      whatsapp: {
        isConnected: true,
        connectedUser: 'Terhubung ke Database'
      },
      model: 'gemini-3.1-flash-lite',
      dailyQuotaTokens: DAILY_QUOTA_TOKENS,
      dailyQuotaRequests: DAILY_QUOTA_REQUESTS,
      today: {
        promptTokens: todayPrompt,
        candidatesTokens: todayCandidates,
        totalTokens: todayTotal,
        requestsCount: todayRequests,
        remainingTokens,
        remainingRequests,
        percentTokensUsed,
        percentRequestsUsed
      },
      allTime: {
        totalTokens: allTimeTotal,
        totalRequests: allTimeRequests
      },
      recentLogs
    };
  } catch (err) {
    return {
      success: false,
      whatsapp: { isConnected: false, connectedUser: null },
      model: 'gemini-3.1-flash-lite',
      dailyQuotaTokens: DAILY_QUOTA_TOKENS,
      dailyQuotaRequests: DAILY_QUOTA_REQUESTS,
      today: {
        promptTokens: 0,
        candidatesTokens: 0,
        totalTokens: 0,
        requestsCount: 0,
        remainingTokens: DAILY_QUOTA_TOKENS,
        remainingRequests: DAILY_QUOTA_REQUESTS,
        percentTokensUsed: 0,
        percentRequestsUsed: 0
      },
      allTime: { totalTokens: 0, totalRequests: 0 },
      recentLogs: []
    };
  }
};
