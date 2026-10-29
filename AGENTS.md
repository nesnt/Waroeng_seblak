# Aturan Proyek - Waroeng Seblak 48

## 🔒 Keamanan Kredensial & Privasi File `.env` (Strict Policy)

1. **DILARANG KERAS MENGAKSES FILE `.env`:**
   - Asisten AI / Agent dilarang keras membuka, membaca (`read_file`), mengedit (`edit_file`), menimpa (`write_file`), memeriksa isi, mencetak, atau mengeksekusi perintah terminal (seperti `cat`, `Get-Content`, `type`, dsb) yang menargetkan atau menampilkan isi file `.env` di seluruh workspace (termasuk `ws-admin-48/.env`, `ws-uc-48/.env`, dan file `.env*` lainnya).
   - Segala bentuk referensi environment variables hanya boleh menggunakan template publik [`.env.example`](file:///c:/code/Project_intern/seblak/ws-admin-48/.env.example).
   - Kredensial rahasia (Supabase Anon Key, API Key, Token, Password Database) milik pengguna bersifat pribadi dan tidak boleh diakses, diminta, atau dimunculkan ke dalam percakapan.

