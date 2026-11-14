# UMKM WhatsApp AI Agent Backend - Waroeng Seblak 48

Backend service cerdas berbasis Node.js dan TypeScript yang mengintegrasikan **WhatsApp Gateway (Baileys)**, **Google Gemini 2.5 Flash (Function Calling)**, dan **Supabase (PostgreSQL & Storage)** untuk melayani pelanggan secara interaktif serta menyediakan asisten operasional bisnis bagi pemilik (Owner) Waroeng Seblak 48.

---

## 🌟 Fitur Unggulan

### 1. Dual-Role Intelligence (Owner vs Pelanggan)
Sistem secara otomatis mendeteksi nomor pengirim dan mengaktifkan persona AI serta hak akses tools yang tepat:
- **Mode Owner (Pemilik Warung):**
  - Cek omset harian realtime (total pendapatan, tunai vs QRIS vs transfer, transaksi batal).
  - Peringatan stok kritis (bahan baku, topping seblak prasmanan, dan stok minuman).
  - Cek daftar transaksi terbaru dari kasir.
  - Update atau restok bahan langsung dari obrolan WhatsApp.
- **Mode Pelanggan (Customer Service "Mba Seblak 48"):**
  - Sapaan hangat, ramah, dan bersahabat khas kuliner UMKM.
  - Penjelasan konsep seblak prasmanan, pilihan aneka topping lezat, dan level pedas (Level 0–5).
  - Rekomendasi minuman segar pendamping seblak.
  - Cek ketersediaan menu/topping hari ini.
  - Pengiriman tautan/media brosur promo resmi.
  - Kalkulasi estimasi total harga pesanan seblak.
  - *Perlindungan Data:* Tidak akan pernah membocorkan omset, modal bahan, atau rahasia warung kepada pelanggan.

### 2. Multi-Turn Function Calling Loop
- Menggunakan SDK resmi `@google/genai` dengan model `gemini-2.5-flash`.
- Eksekusi loop otomatis: Gemini memutuskan kapan harus memanggil database Supabase, mengeksekusi tool yang relevan, lalu merangkum jawaban natural dalam bahasa Indonesia yang terstruktur.

### 3. Visual & Terminal QR Scanner
- Scan QR code langsung di **Terminal** (via `qrcode-terminal`).
- Atau buka di **Browser**: `http://localhost:5000/status` untuk melihat tampilan QR code visual yang otomatis me-refresh hingga terhubung.

---

## 📁 Struktur Direktori

```text
ws-bot-48/
├── src/
│   ├── config/
│   │   ├── env.ts             # Validasi variabel environment dengan Zod
│   │   └── supabase.ts        # Client Supabase dengan Service Role Key
│   ├── database/
│   │   └── schema.sql         # Skema database & tabel audit WA di Supabase
│   ├── services/
│   │   ├── whatsapp.ts        # Gateway Baileys, auth session, message handler, media sender
│   │   ├── gemini.ts          # Integrasi Gemini 2.5 Flash, multi-turn session, Function Calling loop
│   │   └── supabaseService.ts # Service query database (omset, inventori, katalog, audit log)
│   ├── tools/
│   │   ├── ownerTools.ts      # Deklarasi tools Gemini khusus Owner + validator Zod
│   │   └── customerTools.ts   # Deklarasi tools Gemini khusus Pelanggan + validator Zod
│   ├── utils/
│   │   └── roleGuard.ts       # Normalisasi nomor telepon & pendeteksi Owner vs Customer
│   └── index.ts               # Server Express & entry point
├── .env.example               # Template konfigurasi environment
├── package.json               # Konfigurasi dependensi modul ESM
├── tsconfig.json              # Konfigurasi compiler TypeScript NodeNext
└── README.md                  # Dokumentasi lengkap sistem
```

---

## 🚀 Panduan Setup & Menjalankan

### 1. Salin Environment Variables
Salin file `.env.example` menjadi `.env` di dalam folder `ws-bot-48/`:
```bash
cp .env.example .env
```
Isi variabel berikut pada file `.env`:
- `GEMINI_API_KEY`: Dapatkan dari [Google AI Studio](https://aistudio.google.com/).
- `SUPABASE_URL`: URL project Supabase Anda.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key dari dashboard Supabase (Settings > API).
- `OWNER_PHONE_NUMBERS`: Nomor HP pemilik warung diawali kode negara tanpa tanda `+` (contoh: `628123456789,628987654321`).

### 2. Inisialisasi Database (Opsional jika sudah ada)
Jika tabel pendukung audit WhatsApp belum ada, jalankan isi file `src/database/schema.sql` di SQL Editor Supabase Anda.

### 3. Menjalankan Server Development
```bash
cd ws-bot-48
npm run dev
```

### 4. Menghubungkan WhatsApp
1. Periksa terminal saat server berjalan, atau buka browser di:
   ```
   http://localhost:5000/status
   ```
2. Buka aplikasi WhatsApp di HP Anda:
   - Pilih menu **Perangkat Tertaut** (*Linked Devices*).
   - Klik **Tautkan Perangkat** (*Link a Device*).
   - Arahkan kamera HP ke QR Code yang muncul di layar terminal atau browser.
3. Setelah berhasil terhubung, bot langsung aktif merespons pesan masuk!

---

## 📡 REST API & Webhook Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Informasi versi service dan status koneksi WhatsApp |
| `GET` | `/health` | Health check endpoint untuk monitoring uptime |
| `GET` | `/status` | Visual QR code scanner dan status gateway WhatsApp |
| `POST` | `/api/send-message` | Kirim pesan teks manual `{ "to": "628...", "message": "Halo" }` |
| `POST` | `/api/send-media` | Kirim pesan gambar `{ "to": "628...", "imageUrl": "https://...", "caption": "..." }` |
| `POST` | `/api/alert-owner-stock` | Memicu pengiriman broadcast peringatan stok menipis ke seluruh nomor owner |

