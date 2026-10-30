# Log Perkembangan Proyek - Waroeng Seblak 48

Tanggal: 30 Oktober 2026  
Status: Berjalan Normal & Terverifikasi

---

## 📌 Ringkasan Pembaruan & Fitur Baru

### 1. Migrasi Autentikasi ke Supabase Auth Resmi (Bcrypt Cloud Security)
- **Menggantikan Hardcoded Frontend Authentication:**
  - Menghapus perbandingan password mentah (*plaintext*) di sisi JavaScript peramban.
  - Membuang penyimpanan password mentah dari `localStorage` browser demi mencegah pembobolan melalui Chrome DevTools (`F12`).
- **Implementasi Supabase Auth (`@supabase/supabase-js`):**
  - Menggunakan `supabase.auth.signInWithPassword({ email, password })` untuk login aman dengan enkripsi password standar server Supabase (*bcrypt*).
  - Menyimpan token sesi (*signed JWT*) resmi Supabase secara otomatis dan persisten dengan auto-refresh token.
  - Menambahkan pengecekan sesi aktif `supabase.auth.getSession()` saat halaman dimuat ulang sehingga admin tetap login secara aman.
  - Mendukung fungsi `supabase.auth.signOut()` saat admin menekan tombol logout.
- **Tab Pendaftaran Master Admin Terintegrasi:**
  - Halaman login admin (`ws-admin-48`) kini memiliki tab **"Masuk Admin"** dan tab **"Daftar Master Admin"**.
  - Pengelola toko dapat mendaftarkan akun admin pertama secara langsung ke Supabase Cloud dengan checklist kekuatan sandi (min 8 karakter, 1 huruf kapital, 1 simbol).
  - Tersedia fallback aman untuk lingkungan offline lokal jika internet warung padam.
- **Dukungan Autentikasi Kasir (`ws-uc-48`):**
  - Portal kasir kini memverifikasi login ke Supabase Auth terlebih dahulu dengan indikator pemrosesan (*loading spinner*).

### 2. Pembersihan & Simplifikasi Pengaturan Toko
- **Penghapusan Bagian Takaran Resep:**
  - Menghapus bagian *"Daftar Menu & Takaran Resep Pengurang Stok"* dari antarmuka Pengaturan Warung (`SettingsView.tsx`).
  - Menghapus komponen modal formulir menu (`MenuFormModal`), modal editor resep (`RecipeEditorModal`), dan dialog konfirmasi hapus menu yang sudah tidak diperlukan.
  - Merapikan props pada `SettingsView` dan `App.tsx` tanpa menyisakan peringatan TypeScript.

### 3. Modal Rahasia Manajemen Akun (Admin & Kasir)
- **Komponen Modal Baru (`AccountManagementModal.tsx`):**
  - Menyediakan form pendaftaran akun baru dengan pilihan peran:
    - **Administrator (ADMIN):** Akses penuh dashboard manajemen stok, laporan keuangan, riwayat, dan pengaturan.
    - **Kasir (KASIR):** Akses portal pencatatan mangkuk seblak, pemilihan topping prasmanan, dan cetak struk nota.
  - Tab *Daftar Akun Terdaftar* untuk meninjau seluruh akun aktif dengan status enkripsi password yang aman.
- **Mekanisme Akses Rahasia (Easter Egg 5x Klik):**
  - Modal dibuka dengan mengklik icon logo api di pojok kiri atas sebanyak **5 kali berturut-turut** (dalam jeda < 3 detik).
  - Tersedia baik di halaman Login (`App.tsx`) maupun di Sidebar navigasi dashboard admin (`Navigation.tsx`).

### 4. Validasi Keamanan Kata Sandi
- **3 Kriteria Wajib Password:**
  - Minimal **8 karakter**.
  - Mengandung minimal **1 huruf kapital (A-Z)**.
  - Mengandung minimal **1 simbol / karakter khusus** (`!@#$%^&*...`).
- **Indikator Real-time Interaktif:**
  - Ditampilkan langsung di bawah input kata sandi dengan indikator checklist centang hijau saat pengguna mengetik.
  - Dilengkapi validasi ganda pada sisi klien dan fungsi `validatePasswordStrength`.

### 5. Tombol Tutup (X) Hero Banner Dashboard
- Menambahkan tombol tutup **(X)** di pojok kanan atas banner *"Dashboard Stok & Omset Warung"* pada `DashboardView.tsx`.
- Status penutupan disimpan secara persisten di `localStorage` (`seblak48_hide_hero_banner: true`) sehingga tidak muncul kembali saat halaman dimuat ulang.

### 6. Input Satuan Bahan Baku Read-Only
- Mengubah isian **Satuan** pada modal tambah & edit bahan baku/topping di `InventoryView.tsx` menjadi **Read-only** (`pcs`), dilengkapi dengan atribut `cursor-not-allowed` dan label keterangan `(Otomatis / Tetap)`.

### 7. Skrip Sinkronisasi Supabase Auth & DB
- Disediakan skrip `planning/supabase_auth_setup.sql` yang siap dijalankan di Supabase SQL Editor untuk sinkronisasi otomatis `auth.users` ke tabel profil `public.users` via trigger database Postgres.

### 8. Aturan Privasi & Keamanan Proyek
- Menetapkan aturan ketat pada file `AGENTS.md` dan `GEMINI.md` yang melarang keras AI/Agent mengakses, membaca, atau menampilkan file `.env`.
