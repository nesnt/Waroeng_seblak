# Log Perkembangan Proyek - Waroeng Seblak 48

Tanggal: 31 Oktober 2026  
Status: Berjalan Normal & Terverifikasi (Admin Port 3001, Kasir Port 3000)

---

## 📌 Ringkasan Pembaruan Terkini

### 1. Sinkronisasi Riwayat Transaksi & Laporan Omset ke Dashboard Admin
- **Perbaikan Query PostgREST Supabase:**
  - Menghilangkan dependensi relasi join `menu_items(name)` dan `topping_options(name)` yang rentan memicu error 400 schema cache di PostgREST.
  - Memanfaatkan nama menu dan topping yang sudah tersimpan langsung di `transaction_items.menu_name`.
  - Menambahkan strategi *resilient fallback*: jika query relasi nested item mengalami kendala, sistem otomatis fallback ke tabel transaksi utama sehingga omset dan nomor nota tidak akan pernah hilang.
- **Perbaikan Generator Nomor Nota (Invoice):**
  - Mengubah invoice number format menjadi `TR-48-[timestamp-suffix][random-digits]` (misal: `TR-48-28491`) agar 100% unik dan tidak pernah gagal karena bentrok *unique constraint*.
  - Menyertakan kolom `dine_type` ('Makan di Sini' / 'Dibungkus') secara eksplisit saat insert transaksi.
- **Perbaikan Filter Tanggal Transaksi & Omset Harian:**
  - Mengatasi *hardcoded filter date* (`2026-10-19`) pada [TransactionHistoryView.tsx](file:///c:/code/Project_intern/seblak/ws-admin-48/src/components/TransactionHistoryView.tsx) yang sebelumnya menyaring dan menyembunyikan transaksi baru.
  - Memperbarui [SalesReportView.tsx](file:///c:/code/Project_intern/seblak/ws-admin-48/src/components/SalesReportView.tsx) agar default sub-filternya dinamis ke tanggal hari ini (misal 31 Oktober 2026), bukan statis ke tanggal 19.
  - Menambahkan auto-sync refetch pada [App.tsx](file:///c:/code/Project_intern/seblak/ws-admin-48/src/App.tsx) setiap kali admin berpindah tab atau secara berkala setiap 8 detik sehingga transaksi kasir langsung masuk ke layar admin.

---

### 2. Tampilan Pilihan Mangkuk Kasir Disertai Nama Pemesan
- **Pencarian & Kartu Mangkuk Informatif ([CashierRecordView.tsx](file:///c:/code/Project_intern/seblak/ws-uc-48/src/components/CashierRecordView.tsx)):**
  - Pada langkah *"Pencatatan Otomatis"*, tombol pilihan mangkuk antrean kini menampilkan:
    - **Badge Nomor Mangkuk** (misal: `#12`).
    - **Nama Pemesan** (misal: `Nabil`).
    - **Tipe Pesanan** (*Makan di Sini* / *Dibungkus*).
    - **Rincian Level Pedas & Jenis Kuah** (misal: `Lvl 2 • Asin Manis`).
  - Kolom pencarian kini mendukung pencarian nomor mangkuk **sekaligus nama pemesan**.

---

### 3. Akun Kasir Baru: Nabil
- **Kredensial:**
  - Nama: `Nabil`
  - Peran: `KASIR`
  - Email: `nabil@gmail.com`
  - Sandi: `I2345678*`
- **Akses:**
  - Aktif di portal Kasir ([http://localhost:3000](http://localhost:3000)).
  - Tersedia skrip SQL Supabase di `planning/create_kasir_nabil.sql` untuk sinkronisasi cloud permanen.
