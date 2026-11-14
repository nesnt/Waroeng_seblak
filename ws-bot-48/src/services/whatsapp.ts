import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import { env } from '../config/env.js';
import { getSenderRole, normalizePhoneNumber, UserRole } from '../utils/roleGuard.js';
import { processMessage, resetUserSession } from './gemini.js';
import { logChatToSupabase } from './supabaseService.js';
import { logServerError } from '../utils/logger.js';

// Status runtime WhatsApp
let sock: WASocket | null = null;
let isConnected = false;
let currentQrCode: string | null = null;
let qrTimestamp: number | null = null;
let connectedUserJid: string | null = null;

// Logger Pino untuk Baileys (level 'warn' agar terminal bersih dari spam log internal)
const logger = pino({ level: 'warn' });

/**
 * Mengambil teks pesan dari berbagai format payload pesan Baileys
 */
const extractMessageText = (message?: proto.IMessage | null): string => {
  if (!message) return '';
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  return '';
};

/**
 * Footer Menu Opsi Cepat yang otomatis dilampirkan agar pengguna bisa langsung klik/ketik angka
 */
export const getQuickMenuFooter = (role: UserRole): string => {
  if (role === 'OWNER') {
    return `\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *OPSI CEPAT (Ketik Angka):*\n1️⃣ 📊 Cek Omset Hari Ini\n2️⃣ ⚠️ Cek Stok Menipis\n3️⃣ 🧾 Cek Transaksi Terakhir\n4️⃣ 📦 Cek Seluruh Stok\n5️⃣ 🔄 Reset Sesi Chat\n━━━━━━━━━━━━━━━━━━━━\n👉 _Balas angka *1 - 5* untuk perintah cepat!_`;
  }
  return `\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *PILIHAN MENU CEPAT:*\n1️⃣ 📋 Daftar Menu & Harga\n2️⃣ 🌶️ Rekomendasi Topping & Level Pedas\n3️⃣ 📍 Alamat & Jam Buka Warung\n4️⃣ 🎁 Brosur Menu & Promo\n5️⃣ 🔄 Mulai Ulang Obrolan\n━━━━━━━━━━━━━━━━━━━━\n👉 _Ketik angka *1 - 5* untuk pilih cepat!_`;
};

/**
 * Menerjemahkan angka/kata kunci pintasan menjadi perintah lengkap untuk AI
 */
export const resolveShortcutText = (text: string, role: UserRole): { textToProcess: string; isReset: boolean } => {
  const clean = text.trim().toLowerCase();

  // Reset sesi obrolan
  if (clean === 'reset' || clean === 'clear' || clean === 'mulai ulang' || clean === '5') {
    return { textToProcess: '', isReset: true };
  }

  if (role === 'OWNER') {
    switch (clean) {
      case '1':
      case 'omset':
      case 'cek omset':
        return { textToProcess: 'Tolong berikan ringkasan omset penjualan dan transaksi kasir hari ini secara lengkap.', isReset: false };
      case '2':
      case 'stok':
      case 'stok menipis':
      case 'cek stok':
        return { textToProcess: 'Bahan baku atau minuman apa saja yang stoknya menipis atau habis di bawah batas aman?', isReset: false };
      case '3':
      case 'transaksi':
      case 'kasir':
      case 'cek transaksi':
        return { textToProcess: 'Tolong tampilkan daftar beberapa transaksi penjualan terakhir yang dicatat di kasir.', isReset: false };
      case '4':
      case 'semua stok':
      case 'inventori':
        return { textToProcess: 'Tolong tampilkan seluruh inventori stok bahan baku dan minuman warung saat ini.', isReset: false };
      default:
        return { textToProcess: text, isReset: false };
    }
  } else {
    // Mode CUSTOMER
    switch (clean) {
      case '1':
      case 'menu':
      case 'katalog':
      case 'harga':
        return { textToProcess: 'Halo kak, bisa tolong tampilkan katalog menu seblak prasmanan, aneka topping, dan minuman beserta harganya?', isReset: false };
      case '2':
      case 'topping':
      case 'rekomendasi':
      case 'pedas':
        return { textToProcess: 'Apa saja varian topping seblak yang paling favorit dan pilihan level pedas yang tersedia di Waroeng Seblak 48?', isReset: false };
      case '3':
      case 'alamat':
      case 'lokasi':
      case 'jam buka':
        return { textToProcess: 'Bisa minta informasi alamat lengkap warung, petunjuk lokasi, dan jam operasional bukanya?', isReset: false };
      case '4':
      case 'brosur':
      case 'promo':
        return { textToProcess: 'Bisa minta link foto brosur menu dan info promo terbaru Waroeng Seblak 48?', isReset: false };
      default:
        return { textToProcess: text, isReset: false };
    }
  }
};

/**
 * Mengambil opsi pengiriman pesan (termasuk fitur pesan sementara / disappearing messages)
 */
const getMessageSendOptions = () => {
  const options: any = {};
  if (env.EPHEMERAL_EXPIRATION_SECONDS && env.EPHEMERAL_EXPIRATION_SECONDS > 0) {
    options.ephemeralExpiration = env.EPHEMERAL_EXPIRATION_SECONDS;
  }
  return options;
};

/**
 * Inisialisasi koneksi WhatsApp Gateway menggunakan Baileys
 */
export const initWhatsApp = async (): Promise<WASocket> => {
  console.log('[WhatsApp] Menyiapkan session multi-file auth di:', env.SESSION_DATA_PATH);
  const { state, saveCreds } = await useMultiFileAuthState(env.SESSION_DATA_PATH);

  sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false, // Ditangani manual dengan qrcode-terminal
    browser: ['Waroeng Seblak 48 Agent', 'Chrome', '1.0.0']
  });

  // Simpan pembaharuan kredensial sesi secara otomatis
  sock.ev.on('creds.update', saveCreds);

  // Monitor status koneksi dan event QR code
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrCode = qr;
      qrTimestamp = Date.now();
      console.log('\n======================================================');
      console.log('  SCAN QR CODE WHATSAPP BERIKUT DENGAN PONSEL ANDA:  ');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\nAtau buka browser Anda di: http://localhost:' + env.PORT + '/status untuk melihat QR.');
    }

    if (connection === 'close') {
      isConnected = false;
      connectedUserJid = null;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.warn(`[WhatsApp] Koneksi terputus. Kode: ${statusCode}. Mencoba sambung ulang: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(() => {
          initWhatsApp();
        }, 3000);
      } else {
        console.warn('[WhatsApp] Sesi lama telah expired / logged out. Membersihkan auth dan membuat QR code baru...');
        try {
          if (fs.existsSync(env.SESSION_DATA_PATH)) {
            fs.rmSync(env.SESSION_DATA_PATH, { recursive: true, force: true });
          }
        } catch (e) {
          console.error('[WhatsApp] Gagal membersihkan folder sesi:', e);
        }
        setTimeout(() => {
          initWhatsApp();
        }, 1500);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQrCode = null;
      qrTimestamp = null;
      connectedUserJid = sock?.user?.id || 'Connected';
      console.log('\n======================================================');
      console.log(`✅ [WhatsApp] TERHUBUNG SUKSES!`);
      console.log(`Nomor Bot: ${connectedUserJid}`);
      console.log('======================================================\n');
    }
  });

  // Handler pesan masuk
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify' || !m.messages || m.messages.length === 0) return;

    for (const msg of m.messages) {
      // 1. Abaikan pesan dari diri sendiri
      if (msg.key.fromMe) continue;

      // 2. Abaikan pesan broadcast status
      const senderJid = msg.key.remoteJid;
      if (!senderJid || senderJid.endsWith('@broadcast') || senderJid.includes('@g.us')) {
        // Hanya proses private message (1-on-1 chat)
        continue;
      }

      // 3. Ekstrak teks pesan
      const incomingText = extractMessageText(msg.message).trim();
      if (!incomingText) continue;

      // Resolusi nomor telepon jika pengirim menggunakan format WhatsApp LID (@lid)
      let effectiveSenderJid = senderJid;
      if (senderJid.endsWith('@lid')) {
        try {
          const resolvedPn = await (sock as any)?.signalRepository?.lidMapping?.getPNForLID(senderJid);
          if (resolvedPn) {
            effectiveSenderJid = resolvedPn;
          } else {
            const lidId = senderJid.split('@')[0].split(':')[0];
            const reverseFile = path.join(env.SESSION_DATA_PATH, `lid-mapping-${lidId}_reverse.json`);
            if (fs.existsSync(reverseFile)) {
              const mappedPn = JSON.parse(fs.readFileSync(reverseFile, 'utf-8'));
              if (mappedPn) {
                effectiveSenderJid = `${mappedPn}@s.whatsapp.net`;
              }
            }
          }
        } catch {
          // Abaikan error resolusi
        }
      }

      const pushName = msg.pushName || 'Pengguna WhatsApp';
      const role = getSenderRole(effectiveSenderJid, senderJid);
      const cleanPhone = normalizePhoneNumber(effectiveSenderJid);

      console.log(`[Pesan Masuk] Dari: ${pushName} (${cleanPhone}) | Role: [${role}] | Pesan: "${incomingText}"`);

      const sendOptions = getMessageSendOptions();

      // Periksa apakah pesan merupakan pintasan angka/menu atau permintaan reset sesi sekali pakai
      const { textToProcess, isReset } = resolveShortcutText(incomingText, role);

      if (isReset) {
        resetUserSession(senderJid);
        const resetNotice = role === 'OWNER'
          ? '🔄 *Sesi Obrolan Owner Berhasil Direset!*\n\nRiwayat obrolan sebelumnya telah dibersihkan dari memori AI. Anda sekarang memulai sesi operasional baru.'
          : '🔄 *Sesi Obrolan Berhasil Direset!*\n\nRiwayat obrolan sebelumnya telah dibersihkan. Silakan mulai obrolan baru!';

        if (sock) {
          await sock.sendMessage(senderJid, {
            text: `${resetNotice}${getQuickMenuFooter(role)}`
          }, sendOptions);
          console.log(`[Sesi Direset] Sesi chat untuk ${pushName} (${cleanPhone}) telah dibersihkan.`);
        }
        continue;
      }

      try {
        // Tampilkan indikator "sedang mengetik..." di WhatsApp
        if (sock) {
          await sock.sendPresenceUpdate('composing', senderJid);
        }

        // Proses pesan melalui Google Gemini AI & Function Calling
        const result = await processMessage(senderJid, textToProcess, role);

        // Sematkan footer menu opsi cepat jika belum ada di dalam balasan
        const finalTextWithMenu = result.text.includes('━━━━━━━━━━━━━━━━━━━━')
          ? result.text
          : `${result.text}${getQuickMenuFooter(role)}`;

        // Kirim balasan ke pengguna dengan opsi disappearing message
        if (sock) {
          if (result.mediaUrl) {
            // Jika ada media gambar yang perlu dikirim (contoh brosur promo)
            await sock.sendMessage(senderJid, {
              image: { url: result.mediaUrl },
              caption: finalTextWithMenu
            }, sendOptions);
          } else {
            // Kirim balasan pesan teks standar
            await sock.sendMessage(senderJid, {
              text: finalTextWithMenu
            }, sendOptions);
          }
          console.log(`[Pesan Terkirim] Berhasil membalas pesan ke ${pushName} (${cleanPhone})`);
        }

        // Simpan audit log ke Supabase secara asynchronous
        logChatToSupabase({
          senderJid,
          senderRole: role,
          senderName: pushName,
          incomingMessage: incomingText,
          aiResponse: result.text,
          toolCallsExecuted: result.toolCallsExecuted
        }).catch(() => {});

      } catch (err: any) {
        logServerError('WhatsApp Incoming Message Handler', err, {
          senderJid,
          senderRole: role,
          senderName: pushName,
          incomingText
        });

        if (sock) {
          const fallbackText = role === 'OWNER'
            ? 'Mohon maaf Bos, terjadi kendala teknis sementara pada sistem bot. Detail error telah dicatat ke log server terminal. Silakan coba beberapa saat lagi.'
            : 'Mohon maaf kak, sistem kami sedang mengalami sedikit gangguan. Silakan coba sesaat lagi ya! 🙏';

          await sock.sendMessage(senderJid, {
            text: fallbackText
          }, sendOptions).catch(() => {});
        }
      } finally {
        // Pastikan indikator mengetik selalu dihentikan
        if (sock) {
          await sock.sendPresenceUpdate('paused', senderJid).catch(() => {});
        }
      }
    }
  });

  return sock;
};

/**
 * Mengirim pesan teks secara manual via API atau broadcast
 */
export const sendTextMessage = async (jid: string, text: string) => {
  if (!sock || !isConnected) throw new Error('WhatsApp Gateway belum terhubung!');
  const targetJid = jid.includes('@s.whatsapp.net') ? jid : `${normalizePhoneNumber(jid)}@s.whatsapp.net`;
  return await sock.sendMessage(targetJid, { text }, getMessageSendOptions());
};

/**
 * Mengirim pesan gambar secara manual via API atau broadcast
 */
export const sendImageMessage = async (jid: string, imageUrl: string, caption?: string) => {
  if (!sock || !isConnected) throw new Error('WhatsApp Gateway belum terhubung!');
  const targetJid = jid.includes('@s.whatsapp.net') ? jid : `${normalizePhoneNumber(jid)}@s.whatsapp.net`;
  return await sock.sendMessage(targetJid, {
    image: { url: imageUrl },
    caption
  }, getMessageSendOptions());
};

/**
 * Status kesehatan koneksi WhatsApp
 */
export const getWhatsAppStatus = () => {
  return {
    isConnected,
    connectedUser: connectedUserJid,
    currentQrCode,
    qrTimestamp
  };
};

