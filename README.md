# Marsiadapari Hijau 🌿
*Aplikasi Ekoteologi Kristen & Gotong Royong Danau Toba untuk Jemaat dan Mahasiswa IAKN Tarutung*

> **Tagline:** *"Merawat ciptaan Tuhan, bergotong royong setiap hari."*

---

## 🌟 Tentang Aplikasi

**Marsiadapari Hijau** mengintegrasikan teologi penciptaan Kristen dengan kearifan lokal Batak *"Marsiadapari"* (gotong royong tanpa pamrih) di kawasan Rura Silindung dan Danau Toba, Tapanuli Utara.

Fitur utama meliputi:
1. **Renungan Ciptaan Harian** dengan ayat Alkitab, aksi praktis 1 menit, dan AI generator renungan personal.
2. **Katalog Tantangan Aksi Hijau** (membawa tumbler, hemat air, tanam pohon, kompos, pilah sampah, dll).
3. **AI Verifikator Bukti Foto** dengan analisis model Gemini Flash (multimodal) untuk verifikasi otomatis dan estimasi dampak.
4. **Chatbot "Sahabat Ciptaan"** asisten ekoteologi yang memahami konteks pengguna dan kearifan Batak.
5. **Pemindai Sampah AI** pengenal jenis sampah (organik, plastik, kertas, B3) & panduan bank sampah.
6. **Taman Virtual & Hutan Komunitas IAKN Tarutung** yang bertumbuh seiring aksi nyata pengguna.
7. **Kalkulator Jejak Hijau & Dashboard Dampak** grafik Recharts, lencana, dan kartu capaian untuk dibagikan.
8. **Galeri Komunitas** untuk berbagi foto aksi lingkungan secara lintas perangkat melalui Supabase Storage.
9. **Doa & Liturgi Ciptaan AI** pembuat doa syukur panen dan susunan ibadah Minggu Ciptaan bagi pemimpin gereja.
10. **Peta Aksi Hijau & Lapor Masalah Lingkungan** Leaflet + OpenStreetMap tanpa API key berbayar.
11. **PWA Standalone & Dukungan Offline** cache data renungan dan aksi di penyimpanan lokal terenkripsi.

### Akses pengunjung
Halaman pengguna dapat dijelajahi tanpa akun. Tombol **Masuk** dan **Daftar** tersedia di kanan atas; chatbot tetap bisa digunakan sebagai pengunjung. Untuk aktivitas yang mengirim, mengubah, atau mengonfirmasi data—seperti verifikasi aksi, pemindai sampah AI, pendaftaran event, laporan, penyiraman taman, dan konfirmasi bukti—pengunjung diminta masuk atau mendaftar. Papan capaian dan grafik dampak menggunakan data aksi terverifikasi yang tersedia; keduanya menampilkan keadaan kosong bila belum ada data, bukan peserta atau angka contoh.

### Lencana Poin Hijau
Profil anggota menampilkan lencana yang terbuka otomatis berdasarkan Poin Hijau: **Sahabat Pohon** (50), **Penjaga Danau** (100), **Marsiadapari Sejati** (250), dan **Pelindung Ciptaan** (500). Progres dihitung dari poin anggota yang tersimpan dan diperbarui otomatis saat poin berubah; lencana yang belum tercapai tetap terlihat sebagai target berikutnya.

Saat lencana baru terbuka, profil menampilkan animasi confetti dan ucapan pencapaian satu kali. Galeri komunitas menyimpan foto secara publik di Supabase Storage agar dapat dilihat lintas perangkat; unggahan hanya dapat dilakukan oleh anggota yang masuk dan pemilik foto dapat menghapus unggahannya sendiri. Foto dikompres di browser sebelum diunggah.

---

## 🚀 Cara Menjalankan Secara Lokal (VS Code / Terminal)

### 1. Prasyarat
- Node.js versi 22.12 atau lebih baru
- NPM / PNPM / Yarn

### 2. Instalasi Dependensi
```bash
git clone <repo-url>
cd marsiadapari-hijau
npm install
```

### 3. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env.local`, lalu atur variabel berikut untuk pengembangan:
```env
VITE_SUPABASE_URL="https://nteafshveqqsqieeephr.supabase.co"
VITE_SUPABASE_ANON_KEY="supabase-publishable-or-anon-key"
SUPABASE_URL="https://nteafshveqqsqieeephr.supabase.co"
SUPABASE_ANON_KEY="supabase-publishable-or-anon-key"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-role-key"
LEADER_SIGNUP_TOKEN="random-long-invitation-secret"
LEADER_AUTH_REDIRECT_URL="http://localhost:3000/pemimpin"
GEMINI_API_KEY="AIzaSy..." # Kunci API dari https://aistudio.google.com/
GEMINI_MODEL="gemini-3.8-flash"
PORT=3000
```

#### Menyiapkan akun dan email verifikasi
1. Buat proyek di [Supabase](https://supabase.com/) dan salin **Project URL** serta **publishable/anon key** ke variabel di atas. Jangan pernah memasukkan `service_role` key ke aplikasi.
2. Di **Authentication → URL Configuration**, tambahkan URL aplikasi lokal (`http://localhost:3000`) dan URL produksi ke daftar redirect yang diizinkan.
3. Aktifkan konfirmasi email di **Authentication → Providers → Email**. Pendaftaran mengirim tautan konfirmasi; setelah akun aktif, setiap proses masuk mengirim kode OTP ke email yang dimasukkan.
4. Agar kode masuk tampil sebagai angka, sesuaikan template **Magic Link** di **Authentication → Email Templates** untuk menyertakan `{{ .Token }}`. Pastikan SMTP/email provider proyek aktif dan memiliki batas pengiriman yang memadai.
5. Untuk produksi, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada environment variables platform deploy lalu lakukan build ulang.
6. Tambahkan `SUPABASE_SERVICE_ROLE_KEY`, `LEADER_SIGNUP_TOKEN`, dan URL callback pemimpin pada `LEADER_AUTH_REDIRECT_URL` sebagai environment server. Jangan pernah memakai prefix `VITE_` untuk service role key atau token undangan.
7. Portal pengguna biasa ada di `/`. Portal pemimpin terpisah di `/pemimpin?undangan=<LEADER_SIGNUP_TOKEN>`; berikan tautan ini hanya kepada pemimpin dan rotasi token setelah distribusi bila tautan perlu dicabut.
8. Tidak ada pendaftaran admin publik. Buat akun admin melalui Supabase Auth, lalu atur `app_metadata` akun tersebut menjadi `{"role":"admin"}` melalui panel admin Supabase. Admin masuk melalui `/admin`.

### Mengaktifkan database bersama
1. Salin `.env.example` menjadi `.env.local`, lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan URL dan **Publishable key** proyek Supabase. Publishable/anon key boleh digunakan browser. Jangan pernah memakai secret/service-role key di `VITE_` variable.
2. Di dashboard Supabase, buka **SQL Editor → New query**. Buka `supabase/migrations/20261027000000_shared_database.sql`, salin seluruh isi file itu ke query, lalu tekan **Run**. Migration membuat tabel organisasi dan data bersama serta mengaktifkan Row Level Security (RLS).
3. Untuk mengaktifkan Galeri Komunitas, jalankan juga seluruh isi `supabase/migrations/20261028000000_community_gallery.sql` melalui **SQL Editor → New query → Run**. Migration ini membuat bucket foto publik dengan batas ukuran 5 MB dan aturan agar hanya anggota masuk yang dapat mengunggah atau menghapus foto miliknya sendiri.
4. Pastikan **Authentication → URL Configuration** mengizinkan URL lokal `http://localhost:3000` dan URL produksi. Untuk membuat akun pemimpin, server juga memerlukan `SUPABASE_SERVICE_ROLE_KEY` dan `LEADER_SIGNUP_TOKEN`; keduanya hanya di environment server.
5. Jalankan ulang `npm run dev`, kemudian masuk sebagai admin atau pemimpin dan ubah/simpan data. Notifikasi di aplikasi memberi tahu status koneksi/sinkronisasi. Laporan baru anggota tersimpan bersama; organisasi, kegiatan, identitas merek, tantangan, renungan, lokasi, dan data laporan yang dikelola memiliki aturan akses sesuai peran.
6. Untuk admin pertama, buat akun melalui **Authentication → Users**, kemudian edit **App Metadata** akun tersebut agar berisi `{"role":"admin"}`. Jangan menaruh peran di User Metadata karena pengguna dapat mengubahnya sendiri.
7. Untuk Vercel, masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di **Project → Settings → Environment Variables**, lalu redeploy. Tambahkan service-role key dan token undangan hanya sebagai variabel server, tanpa prefix `VITE_`.

Data profil, poin, kebun, dan bukti tantangan masih tersimpan lokal. Data bukti/verifikasi dan poin sengaja belum disinkronkan karena pencatatan tepercaya harus dilakukan oleh endpoint server agar pengguna tidak dapat mengubah hasil/poin melalui browser. Tanpa `GEMINI_API_KEY`, verifikasi foto tidak akan memberikan hasil palsu atau poin; fitur AI lain dapat menggunakan mode simulasi.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Cara Deploy ke Vercel

Aplikasi ini sudah dilengkapi berkas `vercel.json` dan folder `/api` berstandar Serverless Functions Vercel.

Semua file `.env*` lokal dikecualikan dari Git dan Vercel. API di folder `api/` dijalankan sebagai Vercel Functions; `vercel.json` mengarahkan rute aplikasi seperti `/admin` dan `/pemimpin` ke SPA.

### Persiapan GitHub
1. Buat repository baru di GitHub. Jika ada pilihan, buat repository kosong tanpa README, `.gitignore`, atau license agar push awal tidak konflik.
2. Dari terminal VS Code di folder proyek, jalankan:
   ```powershell
   git init
   git add .
   git status --short
   ```
3. Sebelum commit, pastikan `.env.local` **tidak** muncul di `git status`. Jika muncul, jangan lanjutkan; pastikan aturan `.gitignore` aktif.
4. Commit dan hubungkan repository (ganti URL contoh dengan URL repository Anda):
   ```powershell
   git commit -m "Prepare Marsiadapari Hijau for Vercel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPOSITORY.git
   git push -u origin main
   ```
5. GitHub Actions otomatis menjalankan pemeriksaan TypeScript dan build pada push/pull request.

### Cara 1: Menggunakan Vercel CLI
```bash
npm i -g vercel
vercel
```
Saat diminta, ikuti panduan terminal dan tambahkan Environment Variable:
- `GEMINI_API_KEY`: Kunci API Gemini Anda
- `GEMINI_MODEL`: `gemini-3.8-flash`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (server-only)
- `SUPABASE_ANON_KEY` (server-side alias for publishable/anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `LEADER_SIGNUP_TOKEN` (server-only)
- `LEADER_AUTH_REDIRECT_URL` (URL produksi dengan path `/pemimpin`)

### Cara 2: Hubungkan Repositori GitHub ke Dashboard Vercel
1. Unggah kode ke GitHub/GitLab.
2. Buka [https://vercel.com/new](https://vercel.com/new) dan impor repository ini.
3. Di bagian **Build and Output Settings**, Vercel akan otomatis mendeteksi:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Tambahkan variabel lingkungan di tab **Environment Variables**:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (gunakan `gemini-3.8-flash`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (URL proyek Supabase, server-only)
   - `SUPABASE_ANON_KEY` (publishable/anon key, untuk fungsi pendaftaran pemimpin)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `LEADER_SIGNUP_TOKEN` (server-only)
   - `LEADER_AUTH_REDIRECT_URL` (URL produksi lengkap, misalnya `https://nama-aplikasi.vercel.app/pemimpin`)
5. Pilih environment **Production**, **Preview**, atau keduanya untuk setiap variable yang diperlukan. Setelah menambah/mengubah variable, lakukan redeploy agar build dan fungsi API memuat nilainya.
6. Di Supabase **Authentication → URL Configuration**, jadikan URL domain Vercel sebagai **Site URL** dan tambahkan URL preview yang diperlukan ke **Redirect URLs**. Pastikan SQL migration database bersama sudah dijalankan.
7. Setelah deploy, uji halaman utama, `/admin`, `/pemimpin`, dan endpoint AI. Tanpa key Gemini, ChatBot masih dapat memberi jawaban simulasi, tetapi Verifikator menampilkan layanan tidak tersedia.

---

## 🛡️ Keamanan & Privasi
- API Key Gemini tidak pernah terekspos ke sisi klien (browser). Semua panggilan diarahkan lewat fungsi server di `/api`.
- Email, kata sandi, dan konfirmasi akun ditangani Supabase Auth; profil aplikasi serta riwayat aksi tetap disimpan lokal di browser.
- Kunci Supabase yang digunakan di browser hanya publishable/anon key. Jangan pernah mengekspos `service_role` key.
- Foto bukti dikompresi di browser sebelum dianalisis dan jangan mengunggah foto orang lain tanpa izin.
- Papan capaian menyediakan opsi tampil sebagai **Anonim** untuk menjaga kerendahan hati dalam berbuat baik.

*Horas ma dihita saluhutna, mauliate!*
#   M a r s i d a p a r i - H i j a u  
 