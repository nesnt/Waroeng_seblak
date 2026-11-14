import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { initWhatsApp, getWhatsAppStatus, sendTextMessage, sendImageMessage } from './services/whatsapp.js';
import { getOwnerPhoneList } from './config/env.js';
import { getLowStockIngredients } from './services/supabaseService.js';

const app = express();

app.use(cors());
app.use(express.json());

// 1. Root & Health Check Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Waroeng Seblak 48 - UMKM WhatsApp AI Agent',
    version: '1.0.0',
    model: env.GEMINI_MODEL,
    status: getWhatsAppStatus()
  });
});

app.get('/health', (_req: Request, res: Response) => {
  const status = getWhatsAppStatus();
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    whatsapp: {
      connected: status.isConnected,
      user: status.connectedUser
    }
  });
});

// 2. Status & Visual QR Code Viewer (Memudahkan scan via Browser)
app.get('/status', (_req: Request, res: Response) => {
  const status = getWhatsAppStatus();

  if (status.isConnected) {
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Status WhatsApp AI Agent - Waroeng Seblak 48</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; margin: 0; }
          .card { background: #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 1px solid #334155; }
          .badge { background: #10b981; color: #fff; padding: 6px 16px; border-radius: 9999px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
          h2 { margin: 8px 0; font-size: 24px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
          .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #ea580c; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">ONLINE & TERHUBUNG</div>
          <h2>WhatsApp Bot Siap</h2>
          <p>AI Agent Waroeng Seblak 48 aktif melayani pelanggan & laporan owner 24/7.</p>
          <p style="margin-top: 12px; font-family: monospace; color: #38bdf8;">Akun: ${status.connectedUser || 'Active'}</p>
          <a href="/health" class="btn">Cek Health API</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  if (status.currentQrCode) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(status.currentQrCode)}`;
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="15">
        <title>Scan QR WhatsApp - Waroeng Seblak 48</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; margin: 0; }
          .card { background: #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 400px; border: 1px solid #334155; }
          .badge { background: #f59e0b; color: #1e293b; padding: 6px 16px; border-radius: 9999px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
          img { border-radius: 12px; margin: 16px 0; background: white; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
          p { color: #94a3b8; font-size: 14px; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">MENUNGGU SCAN</div>
          <h2>Hubungkan WhatsApp</h2>
          <p>Buka WhatsApp di ponsel &gt; Perangkat Tertaut &gt; Tautkan Perangkat</p>
          <img src="${qrImageUrl}" alt="Scan QR WhatsApp" width="280" height="280" />
          <p style="font-size: 12px; color: #64748b;">Halaman ini otomatis me-refresh setiap 15 detik.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="refresh" content="5">
      <title>Menyiapkan WhatsApp Gateway...</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; }
        .card { background: #1e293b; border-radius: 16px; padding: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Menyiapkan Gateway...</h2>
        <p style="color: #94a3b8;">Mohon tunggu beberapa detik sementara Baileys menyiapkan auth keys.</p>
      </div>
    </body>
    </html>
  `);
});

// 3. API REST: Mengirim Pesan Teks
app.post('/api/send-message', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      res.status(400).json({ error: 'Parameter "to" dan "message" wajib diisi' });
      return;
    }

    const result = await sendTextMessage(to, message);
    res.status(200).json({ success: true, messageId: result?.key?.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengirim pesan' });
  }
});

// 4. API REST: Mengirim Pesan Media Gambar
app.post('/api/send-media', async (req: Request, res: Response) => {
  try {
    const { to, imageUrl, caption } = req.body;
    if (!to || !imageUrl) {
      res.status(400).json({ error: 'Parameter "to" dan "imageUrl" wajib diisi' });
      return;
    }

    const result = await sendImageMessage(to, imageUrl, caption);
    res.status(200).json({ success: true, messageId: result?.key?.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengirim media' });
  }
});

// 5. API REST: Alert Stok Kritis Otomatis ke Seluruh Owner
app.post('/api/alert-owner-stock', async (_req: Request, res: Response) => {
  try {
    const owners = getOwnerPhoneList();
    if (owners.length === 0) {
      res.status(400).json({ error: 'Belum ada nomor owner terdaftar di OWNER_PHONE_NUMBERS' });
      return;
    }

    const { ingredients, drinks } = await getLowStockIngredients();
    if (ingredients.length === 0 && drinks.length === 0) {
      res.status(200).json({ message: 'Semua stok dalam keadaan aman. Tidak ada alert dikirim.' });
      return;
    }

    let alertMsg = `⚠️ *PERINGATAN STOK MENIPIS - WAROENG SEBLAK 48* ⚠️\n\nHalo Bos! Sistem mendeteksi beberapa item berikut stoknya hampir habis:\n\n`;

    if (ingredients.length > 0) {
      alertMsg += `*Bahan Baku & Topping:*\n`;
      for (const ing of ingredients) {
        alertMsg += `• ${ing.name}: sisa *${ing.currentStock} ${ing.unit}* (Min: ${ing.minStock})\n`;
      }
      alertMsg += `\n`;
    }

    if (drinks.length > 0) {
      alertMsg += `*Minuman:*\n`;
      for (const d of drinks) {
        alertMsg += `• ${d.name}: sisa *${d.currentStock} ${d.unit}*\n`;
      }
      alertMsg += `\n`;
    }

    alertMsg += `_Segera lakukan restok agar penjualan hari ini tidak terhambat ya!_ 🛒`;

    for (const ownerPhone of owners) {
      await sendTextMessage(ownerPhone, alertMsg);
    }

    res.status(200).json({ success: true, sentTo: owners.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inisialisasi Server Express & WhatsApp Client
const PORT = env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Server] UMKM WhatsApp AI Agent Server Berjalan!`);
  console.log(`📡 URL Health & Status: http://localhost:${PORT}/status`);
  console.log(`🤖 Model AI: ${env.GEMINI_MODEL}`);
  console.log(`======================================================\n`);

  try {
    await initWhatsApp();
  } catch (err) {
    console.error('[WhatsApp Error] Gagal memulai gateway Baileys:', err);
  }
});

// Graceful Shutdown
const handleShutdown = () => {
  console.log('\n[Shutdown] Menutup server dan koneksi WhatsApp...');
  server.close(() => {
    console.log('[Shutdown] Server ditutup.');
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

