# Log Perkembangan Proyek - Waroeng Seblak 48

Tanggal: 29 Oktober 2026  
Status: Berjalan Normal & Terverifikasi

---

## 📌 Ringkasan Pembaruan & Fitur Baru

### 1. Pembersihan & Simplifikasi Pengaturan Toko
- **Penghapusan Bagian Takaran Resep:**
  - Menghapus bagian *"Daftar Menu & Takaran Resep Pengurang Stok"* dari antarmuka Pengaturan Warung (`SettingsView.tsx`).
  - Menghapus komponen modal formulir menu (`MenuFormModal`), modal editor resep (`RecipeEditorModal`), dan dialog konfirmasi hapus menu yang sudah tidak diperlukan.
  - Merapikan props pada `SettingsView` dan `App.tsx` tanpa menyisakan peringatan TypeScript.

### 2. Modal Rahasia Manajemen Akun (Admin & Kasir)
- **Komponen Modal Baru (`AccountManagementModal.tsx`):**
  - Menyediakan form pendaftaran akun baru dengan pilihan peran:
    - **Administrator (ADMIN):** Akses penuh dashboard manajemen stok, laporan keuangan, riwayat, dan pengaturan.
    - **Kasir (KASIR):** Akses portal pencatatan mangkuk seblak, pemilihan topping prasmanan, dan cetak struk nota.
  - Tab *Daftar Akun Terdaftar* untuk meninjau seluruh akun aktif dan menghapus akun staf tambahan.
- **Mekanisme Akses Rahasia (Easter Egg 5x Klik):**
  - Modal dibuka dengan mengklik icon logo api di pojok kiri atas sebanyak **5 kali berturut-turut** (dalam jeda < 3 detik).
  - Tersedia baik di halaman Login (`App.tsx`) maupun di Sidebar navigasi dashboard admin (`Navigation.tsx`).
- **Layanan Akun Terintegrasi (`accountService.ts`):**
  - Mengelola penyimpanan akun pengguna di `localStorage` (`seblak48_users`) dengan sinkronisasi background ke tabel `users` di Supabase.
  - Mengintegrasikan verifikasi login dinamis di Admin (`ws-admin-48`) dan Kasir (`ws-uc-48`).

### 3. Validasi Keamanan Kata Sandi
- **3 Kriteria Wajib Password:**
  - Minimal **8 karakter**.
  - Mengandung minimal **1 huruf kapital (A-Z)**.
  - Mengandung minimal **1 simbol / karakter khusus** (`!@#$%^&*...`).
- **Indikator Real-time Interaktif:**
  - Ditampilkan langsung di bawah input kata sandi dengan indikator checklist centang hijau saat pengguna mengetik.
  - Dilengkapi validasi ganda pada sisi klien dan fungsi `validatePasswordStrength`.

### 4. Tombol Tutup (X) Hero Banner Dashboard
- Menambahkan tombol tutup **(X)** di pojok kanan atas banner *"Dashboard Stok & Omset Warung"* pada `DashboardView.tsx`.
- Status penutupan disimpan secara persisten di `localStorage` (`seblak48_hide_hero_banner: true`) sehingga tidak muncul kembali saat halaman dimuat ulang.

### 5. Input Satuan Bahan Baku Read-Only
- Mengubah isian **Satuan** pada modal tambah & edit bahan baku/topping di `InventoryView.tsx` menjadi **Read-only** (`pcs`), dilengkapi dengan atribut `cursor-not-allowed` dan label keterangan `(Otomatis / Tetap)`.

### 6. Kesiapan Integrasi Google Drive & Supabase
- **Google Drive CDN:**
  - Skema database `image_url` bertipe `TEXT` siap menampung direct CDN URL Google Drive (`https://lh3.googleusercontent.com/d/{fileId}`).
  - Komponen `IngredientIllustration.tsx` dilengkapi dengan `referrerPolicy="no-referrer"` untuk mencegah pemblokiran HTTP 403 Forbidden.
- **Pembersihan String Kredensial:**
  - Menambahkan sanitasi string otomatis pada `supabase.ts` untuk membersihkan tanda kutip (`"..."`) dan spasi liar dari file konfigurasi environment.

### 7. Aturan Privasi & Keamanan Proyek
- Menetapkan aturan ketat pada file `AGENTS.md` dan `GEMINI.md` yang melarang keras AI/Agent mengakses, membaca, atau menampilkan file `.env`.
