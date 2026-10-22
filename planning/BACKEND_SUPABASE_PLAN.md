# Rencana & Analisis Arsitektur Backend: Supabase (PostgreSQL)
## Waroeng Seblak 48 (Dashboard Kasir, Customer Order & Dashboard Admin)

Dokumen ini mendokumentasikan perencanaan teknis, analisis kelayakan, pertimbangan arsitektur, dan peta jalan (roadmap) penerapan **Backend-as-a-Service (BaaS) Supabase PostgreSQL** untuk sistem operasional Waroeng Seblak 48.

---

## 1. Latar Belakang & Keputusan Arsitektur

Saat ini, kedua modul aplikasi berjalan di browser secara mandiri menggunakan `localStorage`:
- **Aplikasi Kasir & Self-Order** (`localhost:3000`): Pemesanan mandiri oleh pelanggan dan POS kasir.
- **Aplikasi Admin / Owner** (`localhost:3001`): Manajemen inventori, laporan omset, dan pengaturan warung.

Karena perbedaan *origin/port*, data tidak terhubung. Keputusan menggunakan **Supabase PostgreSQL** diambil untuk menyediakan **Single Source of Truth** yang andal, hemat waktu pengembangan, dan mendukung skalabilitas warung tanpa beban pemeliharaan infrastruktur server mandiri.

---

## 2. Analisis Keunggulan Supabase untuk Kasus Waroeng Seblak 48

| Aspek | Keunggulan Supabase | Dampak Operasional Warung |
| :--- | :--- | :--- |
| **Realtime Sync** | Supabase Realtime (Postgres Changes via WebSockets) | Pelanggan memesan mangkok di meja/area prasmanan, pesanan **langsung muncul seketika** di layar Kasir dan Dapur tanpa refresh. |
| **Kesesuaian Skema** | PostgreSQL Relasional Murni | Cocok 100% dengan rancangan `DATA_REQUIREMENTS.md` yang menggunakan Foreign Key, UUID, dan relasi transaksi multi-tabel. |
| **Kecepatan Rilis** | API REST & Client SDK Otomatis | Tidak perlu membangun boilerplate Express/NestJS, rute CRUD, dan migrasi server manual. |
| **Kontrol Akses** | Row Level Security (RLS) & Auth | Hak akses Kasir, Admin, dan Pelanggan terisolasi rapi di level database engine. |
| **Integritas Bisnis** | Database Functions (RPC / Stored Procedures) | Logika checkout dan pemotongan stok bahan baku dijamin atomik (ACID). |

---

## 3. Analisis Tantangan Teknis & Strategi Mitigasi

### A. Race Condition pada Stok Topping Prasmanan
* **Masalah:** Beberapa pelanggan atau kasir bisa secara bersamaan memilih item topping yang stok fisiknya tinggal sedikit (misal: sisa 2 pcs dumpling keju). Jika pemotongan stok dilakukan di sisi frontend client, dapat terjadi *negative stock* atau over-selling.
* **Strategi Mitigasi:**
  * **Wajib menggunakan PostgreSQL Stored Procedure (RPC)**, misalnya fungsi `process_pos_checkout(...)`.
  * Transaksi dieksekusi dalam blok atomik:
    ```sql
    BEGIN;
      -- 1. Insert ke tabel transactions
      -- 2. Insert ke transaction_items & transaction_item_toppings
      -- 3. Kurangi current_stock di tabel ingredients dengan pengecekan WHERE current_stock >= qty
      -- 4. Catat otomatis ke tabel stock_logs
      -- 5. Ubah status bowl_orders menjadi 'selesai'
    COMMIT;
    ```
  * Jika stok tidak mencukupi, transaksi otomatis dibatalkan (`ROLLBACK`) dan melempar error yang jelas ke layar kasir.

### B. Keandalan Koneksi Internet di Warung Fisik (Offline Resiliency)
* **Masalah:** Koneksi internet di lokasi warung fisik berpotensi mengalami gangguan atau fluktuasi saat jam sibuk.
* **Strategi Mitigasi:**
  * Menambahkan indikator status koneksi (Online/Offline indicator) di header kasir.
  * Menerapkan strategi caching di frontend:
    * Data katalog bahan dan menu di-cache secara lokal (localStorage / memory).
    * Jika koneksi terputus saat transaksi kasir, sistem memberikan peringatan jelas dan menyiapkan antrian lokal sebelum dikirim ulang saat koneksi pulih.

### C. Keamanan Akses & Isolasi Peran (Row Level Security)
* **Masalah:** Frontend berinteraksi langsung dengan Supabase menggunakan Public Anonymous Key.
* **Strategi Mitigasi:**
  * **Pelanggan (`anon`):**
    * Hanya boleh `SELECT` menu aktif (`menu_items`, `topping_options`).
    * Hanya boleh `INSERT` ke antrian mangkok (`bowl_orders`, `bowl_order_drinks`).
    * Dilarang melihat tabel transaksi, laporan keuangan, atau data pengguna kasir.
  * **Kasir (`authenticated` - role `KASIR`):**
    * Dapat membaca seluruh data operasional, membuat transaksi, dan memperbarui status mangkok.
    * Dilarang menghapus riwayat audit atau mengubah harga modal bahan.
  * **Admin / Owner (`authenticated` - role `ADMIN`):**
    * Hak akses penuh (CRUD) ke seluruh tabel, pengaturan warung, dan laporan omset.

---

## 4. Rencana Arsitektur Sinkronisasi Realtime

```
[ Pelanggan (CustomerOrderView) ]
        │
        │ 1. INSERT bowl_orders (Nomor mangkok, topping, kuah, level pedas)
        ▼
╔══════════════════════════════════════════════════════╗
║                SUPABASE POSTGRESQL                   ║
║  - Tabel: bowl_orders, ingredients, transactions     ║
║  - Realtime Publication: supabase_realtime           ║
╚══════════════════════════════════════════════════════╝
        │                                  │
        │ Realtime Event (INSERT)          │ Realtime Event (UPDATE/INSERT)
        ▼                                  ▼
[ Layar Kasir / KDS Dapur ]        [ Dashboard Admin / Owner ]
- Antrian mangkok muncul live      - Grafik omset terupdate live
- Notifikasi audio mangkok baru    - Alert stok menipis/habis live
```

---

## 5. Rencana Tahapan Eksekusi (Roadmap)

### Fase 1: Persiapan Skema & Database Engine (Database Layer)
1. Buat file `supabase_schema.sql` berisikan:
   - DDL Create Table untuk seluruh 11 entitas dari `DATA_REQUIREMENTS.md`.
   - Primary Key UUID (`gen_random_uuid()`), Foreign Keys, dan Indexing.
   - Initial Seed Data (Katalog bahan seblak, resep, topping, dan pengaturan awal toko).
2. Buat PostgreSQL RPC Function untuk transaksi checkout atomik (`process_pos_checkout`).
3. Konfigurasi Row Level Security (RLS) dan Realtime Publication.

### Fase 2: Integrasi Frontend Kasir (POS & Order Integration)
1. Instal `@supabase/supabase-js` pada project kasir.
2. Buat konfigurasi client `src/services/supabaseClient.ts` dengan memanfaatkan Environment Variable (`.env`).
3. Refaktor `src/services/storage.ts` agar membaca dan menulis langsung ke Supabase dengan fallback error handling yang mulus.
4. Pasang listener realtime untuk mendengarkan pesanan mangkok baru secara otomatis.

### Fase 3: Integrasi Frontend Dashboard Admin
1. Instal `@supabase/supabase-js` pada project admin.
2. Refaktor storage data admin (Inventori, Laporan Penjualan, Riwayat Transaksi).
3. Pasang listener realtime agar kartu KPI omset harian dan stok menipis berkedip/terupdate otomatis ketika kasir memproses pembayaran.

### Fase 4: Uji Coba Lapangan & Hardening
1. Uji simulasi checkout bersamaan (multi-tab/multi-device) untuk memvalidasi pencegahan race condition stok.
2. Uji skenario jaringan terputus (offline test).
3. Optimalisasi query dan audit keamanan RLS.
