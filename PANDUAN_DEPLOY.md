# Panduan Deploy Aplikasi UANGKASBON ke Cloud Hebat (cPanel)

Aplikasi telah disiapkan agar Backend dan Frontend berjalan dalam satu server Node.js. Database SQLite (`.db`) akan ikut tersimpan di server.

## 📦 Persiapan File

1.  Buka folder proyek Anda di Laptop.
2.  Masuk ke folder `backend`.
3.  Pilih semua file di dalam folder `backend` (termasuk folder `public`, `database`, `routes`, dll).
4.  Klik kanan -> **Compress to ZIP** (Beri nama `uangkasbon.zip`).

> [!IMPORTANT]
> Pastikan folder `backend/public` sudah berisi hasil build frontend (index.html, dll). Saya sudah otomatis menyiapkannya untuk Anda.

---

## 🚀 Langkah-Langkah di cPanel Cloud Hebat

### 1. Upload File
1.  Login ke cPanel Cloud Hebat.
2.  Buka **File Manager**.
3.  Buat folder baru di luar `public_html` (misal namanya `apps/uangkasbon`).
4.  Upload file `uangkasbon.zip` ke folder tersebut dan **Extract**.

### 2. Setup Node.js App
1.  Di cPanel, cari menu **Setup Node.js App**.
2.  Klik **Create Application**.
3.  Isi konfigurasi berikut:
    *   **Node.js version**: Pilih versi terbaru (misal 18 atau 20).
    *   **Application mode**: Production.
    *   **Application root**: `apps/uangkasbon` (sesuaikan dengan folder tempat extract tadi).
    *   **Application URL**: `domaininternal.web.id` (pilih domain Anda).
    *   **Application startup file**: `server.js`.
4.  Klik **Create**.

### 3. Install Dependencies
1.  Setelah aplikasi terbuat, klik tombol **Run JS Install** (ini akan menjalankan `npm install`).
2.  Tunggu sampai selesai. Jika ada error terkait `better-sqlite3`, pastikan server memiliki compiler (biasanya sudah ada).

### 4. Konfigurasi Domain (.htaccess)
Biasanya Node.js selector otomatis mengatur ini. Jika domain belum menampilkan aplikasi:
1.  Pastikan file `.htaccess` di folder `public_html` atau root aplikasi mengarah ke Node.js port yang diberikan cPanel.

---

## 🔧 Troubleshooting

*   **SSL Error**: Karena status Anda "No SSL Detected", gunakan `http://` bukan `https://`. Disarankan aktifkan Let's Encrypt SSL di cPanel (menu **SSL/TLS Status**).
*   **Database**: File database akan berada di `apps/uangkasbon/database/kasbon_production.db`. Anda bisa mendownload file ini kapan saja untuk backup manual.
*   **Update Aplikasi**: Jika ada perubahan kode, build ulang di lokal, upload ulang file yang berubah (atau ZIP lagi), lalu klik **Restart** di menu Setup Node.js App.

---

> [!TIP]
> Saya sudah mengubah `baseURL` di frontend menjadi path relatif, sehingga aplikasi akan otomatis mengenali domain di mana pun ia di-deploy.
