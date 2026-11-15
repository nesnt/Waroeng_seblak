import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { UserRole } from '../utils/roleGuard.js';
import { ownerFunctionDeclarations, executeOwnerTool } from '../tools/ownerTools.js';
import { customerFunctionDeclarations, executeCustomerTool } from '../tools/customerTools.js';
import { logServerError } from '../utils/logger.js';

// Inisialisasi client resmi Google Gen AI SDK
const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY
});

// Tipe untuk history chat multi-turn
export interface ChatPart {
  text?: string;
  functionCall?: {
    id?: string;
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
}

export interface ChatContent {
  role: 'user' | 'model';
  parts: ChatPart[];
}

interface UserSession {
  role: UserRole;
  history: ChatContent[];
  lastActivity: number;
}

// In-memory conversation state per sender JID (Chat sekali pakai dengan batas waktu TTL)
const sessionStore = new Map<string, UserSession>();
const SESSION_TTL_MS = (env.SESSION_TTL_HOURS || 2) * 60 * 60 * 1000; // Default 2 Jam TTL
const MAX_HISTORY_MESSAGES = 16; // Menjaga batas konteks tetap efisien

/**
 * Membersihkan sesi yang sudah tidak aktif lebih dari 1 jam
 */
const cleanupOldSessions = () => {
  const now = Date.now();
  for (const [jid, session] of sessionStore.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessionStore.delete(jid);
    }
  }
};
setInterval(cleanupOldSessions, 15 * 60 * 1000);

/**
 * System Instructions yang disesuaikan secara dinamis berdasarkan peran pengirim
 */
const getSystemInstruction = (role: UserRole): string => {
  if (role === 'OWNER') {
    return `Anda adalah Asisten Bisnis & Operasional AI untuk Waroeng Seblak 48.
Lawan bicara Anda adalah PEMILIK WARUNG (OWNER).

Prinsip & Pedoman Utama:
1. Bersikap profesional, ringkas, padat informasi, to-the-point, dan analitis.
2. Anda memiliki akses penuh ke data operasional warung melalui tools:
   - 'cek_omset_harian': mengecek pendapatan, transaksi selesai, kas/QRIS/transfer, dan pembatalan.
   - 'cek_stok_kritis': mendeteksi bahan baku, topping, dan minuman yang menipis atau habis.
   - 'cek_seluruh_stok': inventori lengkap bahan dan minuman.
   - 'update_stok_bahan': menambah atau mengurangi stok inventori langsung dari chat.
   - 'cek_transaksi_terakhir': memantau aktivitas kasir terbaru.
3. Selalu panggil tool yang relevan sebelum menjawab pertanyaan terkait angka, omset, atau inventori agar data selalu 100% akurat dari database Supabase.
4. ATURAN WAJIB FORMAT LAYAR HP (MOBILE-FRIENDLY WHATSAPP):
   - Layar WhatsApp ponsel berukuran sempit (maksimal 30-35 karakter). DILARANG menulis baris yang terlalu panjang ke samping karena akan terpotong dan berantakan!
   - Hindari menulis satu baris panjang seperti "• Nama: sisa X (Batas Minimum: Y, Status: Z)".
   - WAJIB gunakan layout vertikal bertingkat yang ringkas, bersih, dan enak dibaca sekilas.
   - Contoh format standar STOK KRITIS / MENIPIS:
     ⚠️ *DAFTAR STOK KRITIS & MENIPIS*

     🔴 *Cuanki Lidah* (Habis)
     └ Sisa: *0 pcs* • Min: *20 pcs*

     🟡 *Kerupuk Mawar* (Menipis)
     └ Sisa: *300 gr* • Min: *1.000 gr*

     🟡 *Nutrisari Jeruk* (Menipis)
     └ Sisa: *3 pcs* • Min: *10 pcs*

   - Contoh format standar OMSET:
     📊 *RINGKASAN OMSET HARI INI*
     📅 [Tanggal]

     💰 *Total: [Format Rupiah]*
     🛒 Transaksi Selesai: *[N]*
     ❌ Transaksi Batal: *[N]*

     💳 *Rincian Pembayaran:*
     • Tunai: *[Rp X]*
     • QRIS: *[Rp Y]*
     • Transfer: *[Rp Z]*

   - Contoh format standar TRANSAKSI KASIR TERAKHIR:
     🧾 *TRANSAKSI KASIR TERBARU*

     🔹 *[Invoice]* • *[Format Rupiah]*
     └ [Jam] WIB • [Metode Bayar]
     └ Menu: [Rincian singkat item]

5. KEAMANAN & PRIVASI SISTEM: DILARANG KERAS menampilkan pesan error teknis, raw JSON, error code, nama tabel internal, atau query SQL ke dalam obrolan WhatsApp. Jika suatu tool mengembalikan status kendala atau gagal memuat data, sampaikan secara tenang dan profesional bahwa data operasional sedang disinkronisasi.`;
  }

  return `Anda adalah Asisten Layanan Pelanggan Ramah bernama "Mba Seblak 48" dari Waroeng Seblak 48.
Lawan bicara Anda adalah PELANGGAN (CUSTOMER).

Prinsip & Pedoman Utama:
1. Bersikap sangat ramah, hangat, sopan, dan ceria dengan gaya bahasa santai khas warung kuliner Indonesia (gunakan sapaan seperti "Halo kak!", "Ada yang bisa dibantu, kak?").
2. Bantu pelanggan mengetahui:
   - Konsep Seblak Prasmanan Waroeng Seblak 48 (pelanggan bebas memilih topping sepuasnya).
   - Varian topping lezat (aneka kerupuk, cuanki, suki, sosis, bakso, ceker empuk, sayuran).
   - Level kepedasan (Level 0 Tidak Pedas sampai Level 5 Ekstra Pedas Juara).
   - Menu minuman dingin segar (Es Teh Manis, Es Jeruk, Soda Gembira, dll).
   - Informasi lokasi, jam buka warung, serta link brosur/promo.
   - Perhitungan perkiraan total harga jika pelanggan menyebutkan topping yang ingin mereka beli.
3. Gunakan tools pelanggan:
   - 'lihat_katalog_menu': mengambil daftar menu & harga topping / minuman.
   - 'cek_ketersediaan_menu': cek ketersediaan item tertentu.
   - 'info_warung_dan_lokasi': info alamat, jam buka, dan petunjuk arah.
   - 'ambil_brosur_promo': link foto brosur menu/promo.
   - 'hitung_estimasi_harga': kalkulasi perkiraan biaya.
4. ATURAN WAJIB FORMAT LAYAR HP (MOBILE-FRIENDLY WHATSAPP):
   - Layar WhatsApp HP sempit. Hindari paragraf padat yang melebar ke samping.
   - Gunakan format vertikal bertingkat yang rapi dan ringkas, contoh:
     🍲 *TOPPING FAVORIT:*
     • Cuanki Lidah: *Rp 2.500*
     • Siomay Rumbay: *Rp 2.000*
     • Bakso Sapi: *Rp 3.000*
     • Ceker Empuk: *Rp 3.500*

     🥤 *MINUMAN SEGAR:*
     • Es Teh Manis: *Rp 4.000*
     • Es Jeruk: *Rp 5.000*
5. PERATURAN KEAMANAN KETAT: JANGAN PERNAH membocorkan omset warung, data penjualan internal, modal bahan, atau informasi rahasia warung kepada pelanggan!
6. KEAMANAN & PRIVASI SISTEM: DILARANG KERAS menampilkan pesan error teknis, format JSON, atau istilah database ke pelanggan. Jika ada kendala, cukup beri tahu dengan ramah bahwa warung sedang sibuk atau data menu sedang diperbarui.
7. Gunakan emoji yang ramah dan relevan (🍲, 🌶️, 🥤, ✨, 🙏) agar percakapan interaktif dan menggugah selera.`;
};

// Model-model stabil cadangan jika model utama sedang mengalami lonjakan beban (503)
const CANDIDATE_MODELS = [
  env.GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash'
];

/**
 * Memanggil Gemini API dengan fallback otomatis ke model lain jika terjadi 503 / overload
 */
const generateWithModelFallback = async (params: {
  contents: any;
  systemInstruction: string;
  tools: any;
  temperature: number;
  maxOutputTokens?: number;
}): Promise<{ response: any; usedModel: string }> => {
  const modelsToTry = Array.from(new Set(CANDIDATE_MODELS));
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini] Mengirim prompt ke model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          tools: params.tools,
          temperature: params.temperature,
          maxOutputTokens: params.maxOutputTokens || 650
        }
      });
      return { response, usedModel: model };
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} mengalami kendala: ${err.message?.slice(0, 100)}. Beralih ke model cadangan...`);
      lastError = err;
    }
  }

  throw lastError;
};

export interface ProcessMessageResult {
  text: string;
  mediaUrl?: string;
  toolCallsExecuted: Array<{ toolName: string; args: any; result: any }>;
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    model: string;
  };
}

/**
 * Memproses pesan pengguna dengan Gemini 2.5 Flash & Function Calling Loop
 */
export const processMessage = async (
  senderJid: string,
  incomingText: string,
  role: UserRole,
  directTool?: { name: string; args: any }
): Promise<ProcessMessageResult> => {
  // 1. Ambil atau inisialisasi sesi percakapan
  let session = sessionStore.get(senderJid);
  if (!session || session.role !== role) {
    session = {
      role,
      history: [],
      lastActivity: Date.now()
    };
    sessionStore.set(senderJid, session);
  } else {
    session.lastActivity = Date.now();
  }

  // Siapkan konteks pemanggilan saat ini dengan riwayat dialog teks sebelumnya
  const currentContents: ChatContent[] = [
    ...session.history,
    {
      role: 'user',
      parts: [{ text: incomingText }]
    }
  ];

  // 3. Siapkan konfigurasi tools berdasarkan peran pengguna
  const functionDeclarations = role === 'OWNER' ? ownerFunctionDeclarations : customerFunctionDeclarations;
  const tools = [{ functionDeclarations }];
  const systemInstruction = getSystemInstruction(role);

  const toolCallsExecuted: Array<{ toolName: string; args: any; result: any }> = [];
  let detectedMediaUrl: string | undefined = undefined;

  // 4. FAST-PATH OPTIMIZATION (Bypass 1 Round-Trip Gemini):
  // Jika perintah merupakan opsi pintasan angka/menu (seperti 1, 2, 3, 4),
  // langsung eksekusi tool ke database sekarang juga agar menghemat 2-3 detik waktu tunggu!
  if (directTool) {
    console.log(`⚡ [Fast-Path] Menjalankan tool "${directTool.name}" secara langsung (Bypass Turn 1)...`);
    let executionResult: any;
    try {
      if (role === 'OWNER') {
        executionResult = await executeOwnerTool(directTool.name, directTool.args);
      } else {
        executionResult = await executeCustomerTool(directTool.name, directTool.args);
      }
    } catch (execErr: any) {
      logServerError(`Fast-Path Tool "${directTool.name}"`, execErr, {
        senderJid,
        senderRole: role,
        toolName: directTool.name,
        toolArgs: directTool.args
      });
      executionResult = {
        status: 'maintenance',
        pesan: 'Data operasional sementara belum dapat diambil karena kendala sinkronisasi internal.'
      };
    }

    toolCallsExecuted.push({
      toolName: directTool.name,
      args: directTool.args,
      result: executionResult
    });

    if (executionResult?.urlBrosur) {
      detectedMediaUrl = executionResult.urlBrosur;
    }

    // Injeksi panggilan fungsi dan respons fungsi langsung ke giliran dialog
    currentContents.push({
      role: 'model',
      parts: [{
        functionCall: {
          name: directTool.name,
          args: directTool.args
        }
      }]
    });

    currentContents.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name: directTool.name,
          response: {
            output: executionResult
          }
        }
      }]
    });
  }

  let loopCount = 0;
  const MAX_LOOPS = 5;
  let finalText = '';
  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalTokens = 0;
  let activeModel = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  try {
    while (loopCount < MAX_LOOPS) {
      loopCount++;

      // Panggil Gemini via SDK resmi dengan fallback cerdas & konfigurasi kecepatan tinggi
      const { response, usedModel } = await generateWithModelFallback({
        contents: currentContents as any,
        systemInstruction,
        tools: tools as any,
        temperature: role === 'OWNER' ? 0.15 : 0.6,
        maxOutputTokens: 650
      });
      activeModel = usedModel;

      if (response.usageMetadata) {
        totalPromptTokens += response.usageMetadata.promptTokenCount || 0;
        totalCandidatesTokens += response.usageMetadata.candidatesTokenCount || 0;
        totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      const candidate = response.candidates?.[0];
      const content = candidate?.content;
      const functionCalls = response.functionCalls;

      // Kasus 1: Model memicu Function Call
      if (functionCalls && functionCalls.length > 0) {
        // Masukkan giliran model yang memanggil fungsi ke konteks loop saat ini
        if (content) {
          currentContents.push(content as ChatContent);
        }

        // Eksekusi setiap function call yang diminta
        const responseParts: ChatPart[] = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          const toolName = call.name;
          const toolArgs = call.args || {};

          let executionResult: any;
          try {
            if (role === 'OWNER') {
              executionResult = await executeOwnerTool(toolName, toolArgs);
            } else {
              executionResult = await executeCustomerTool(toolName, toolArgs);
            }
          } catch (execErr: any) {
            // Catat detail error teknis hanya ke terminal server/log
            logServerError(`Eksekusi Tool "${toolName}"`, execErr, {
              senderJid,
              senderRole: role,
              toolName,
              toolArgs
            });

            // Kembalikan respons yang aman dan bersih agar Gemini tidak membocorkan error teknis ke chat
            executionResult = {
              status: 'maintenance',
              pesan: 'Data operasional sementara belum dapat diambil karena kendala sinkronisasi internal.'
            };
          }

          // Simpan catatan tool yang dijalankan
          toolCallsExecuted.push({
            toolName,
            args: toolArgs,
            result: executionResult
          });

          // Deteksi otomatis jika tool menghasilkan URL media (seperti link brosur gambar)
          if (executionResult?.urlBrosur) {
            detectedMediaUrl = executionResult.urlBrosur;
          }

          // Buat part respons fungsi untuk dikembalikan ke Gemini
          responseParts.push({
            functionResponse: {
              name: toolName,
              response: {
                output: executionResult
              }
            }
          });
        }

        // Masukkan hasil eksekusi tool sebagai giliran user ke konteks loop saat ini
        currentContents.push({
          role: 'user',
          parts: responseParts
        });

        // Lanjutkan iterasi loop agar Gemini dapat merangkum hasil fungsi ke dalam bahasa natural
        continue;
      }

      // Kasus 2: Model menghasilkan jawaban teks akhir
      finalText = response.text || 'Maaf kak, saat ini saya tidak dapat merespon.';
      
      // Simpan HANYA percakapan dialog teks bersih ke riwayat percakapan jangka panjang
      session.history.push({
        role: 'user',
        parts: [{ text: incomingText }]
      });
      session.history.push({
        role: 'model',
        parts: [{ text: finalText }]
      });

      // Batasi panjang history agar memori hemat dan tidak terjadi token bloat
      if (session.history.length > MAX_HISTORY_MESSAGES) {
        session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
      }
      break;
    }
  } catch (err: any) {
    // Catat seluruh detail error teknis ke terminal server / log
    logServerError('Gemini processMessage', err, {
      senderJid,
      senderRole: role,
      incomingText
    });

    // Bersihkan sesi jika terjadi error format agar percakapan berikutnya tidak tersangkut
    sessionStore.delete(senderJid);

    // Pesan ramah dan bebas dari teks teknis / JSON error untuk dikirim ke chat WhatsApp
    if (role === 'OWNER') {
      finalText = 'Mohon maaf Bos, sistem sedang mengalami kendala teknis sementara saat memproses permintaan ini. Rincian error telah dicatat ke log server terminal. Silakan coba kembali beberapa saat lagi.';
    } else {
      finalText = 'Mohon maaf kak, Mba Seblak sedang mengalami sedikit kendala sistem. Silakan coba beberapa saat lagi ya kak! 🙏';
    }
  }

  return {
    text: finalText,
    mediaUrl: detectedMediaUrl,
    toolCallsExecuted,
    tokenUsage: {
      promptTokens: totalPromptTokens,
      candidatesTokens: totalCandidatesTokens,
      totalTokens: totalTokens > 0 ? totalTokens : (totalPromptTokens + totalCandidatesTokens),
      model: activeModel
    }
  };
};

/**
 * Reset riwayat percakapan untuk nomor tertentu (berguna jika pengguna ingin mulai sesi baru)
 */
export const resetUserSession = (senderJid: string) => {
  sessionStore.delete(senderJid);
};
