
# Marsiadapari Hijau

## Shared application data

Supabase is the shared source of truth for signed-in accounts, community membership,
challenge submissions and points, event registrations, community discussions, and
admin-managed application records. Browser storage remains a cache for the existing
offline experience; it is not the cross-device database.

Before deploying this version, apply the migrations in order to the configured
Supabase project (for example, through the Supabase SQL Editor):

1. [`20261105000000_persistent_application_data.sql`](./supabase/migrations/20261105000000_persistent_application_data.sql)
2. [`20261106000000_repair_storage_and_cheers.sql`](./supabase/migrations/20261106000000_repair_storage_and_cheers.sql)
3. [`20261106010000_fix_thread_media_storage_policies.sql`](./supabase/migrations/20261106010000_fix_thread_media_storage_policies.sql)
4. [`20261106020000_fix_leaderboard_cheer_notifications.sql`](./supabase/migrations/20261106020000_fix_leaderboard_cheer_notifications.sql)
5. [`20261106030000_add_thread_interaction_notifications.sql`](./supabase/migrations/20261106030000_add_thread_interaction_notifications.sql)
6. [`20261106040000_make_thread_interactions_atomic.sql`](./supabase/migrations/20261106040000_make_thread_interactions_atomic.sql)

The second migration repairs challenge-proof read/write policies (including the
permissions required when an upload replaces an existing file) and moves leaderboard
cheer writes to a database function that validates the signed-in account. If it was
already applied before this update, run the updated migration again in the Supabase
SQL Editor so the additional storage policy is created. The third migration adds the
read policy required by Supabase Storage upserts for existing Threads photos.
The fourth migration records leaderboard appreciation and its recipient notification
atomically in the database. The fifth migration adds database-side notifications for
new likes and replies on Threads posts. The sixth migration changes likes and comments
to atomic database operations so concurrent updates and page polling cannot overwrite
new interactions; it also creates their notifications in the same transaction.
Apply all migrations to the same Supabase project as the application.
The frontend also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Data
changes will not sync across devices until the migration is applied and the app is
connected to that same Supabase project.

## Email OTP and confirmation links

Signup confirmation and login OTP use separate Supabase email templates:

- In **Authentication → Email Templates → Confirm signup**, include
  `{{ .ConfirmationURL }}` as the confirmation link.
- In **Authentication → Email Templates → Magic Link**, include
  `{{ .Token }}` if users should be able to enter the six-digit code in the app.
  Keep `{{ .ConfirmationURL }}` too if the template should also offer a clickable
  sign-in link.

The app sends signup and login redirects to its root URL so the single-page app can
process the returned confirmation token. In Supabase **Authentication → URL
Configuration**, set **Site URL** to the deployed app origin and add that origin to
**Redirect URLs**. For local development, allow `http://localhost:3000/**` as well.

If Supabase accepts a login request but no email arrives, check spam, the Supabase
Auth logs/email delivery logs, and the project's SMTP setup and rate limits. The
built-in SMTP service is restricted and rate-limited; configure custom SMTP for
reliable delivery to users. The app cannot deliver or restore email from a template
or SMTP configuration change in the repository.

## Pengaturan dan penghapusan akun

Pengguna dapat mengakhiri sesi di perangkat lain dari halaman Profil. Penghapusan
akun menghapus akun autentikasi beserta data dan foto yang dimiliki pengguna. Untuk
mengaktifkannya, konfigurasi `SUPABASE_SERVICE_ROLE_KEY` hanya di environment server
(misalnya `.env.local` untuk pengembangan); jangan gunakan awalan `VITE_`, kirim ke
browser, atau commit kunci tersebut. Server memakai kunci ini untuk menghapus akun
dan objek Storage setelah memverifikasi sesi pengguna.

Akun admin dan pemimpin yang masih memiliki komunitas tidak dapat dihapus melalui
fitur ini agar data pengelolaan dan komunitas tidak ikut terhapus. Pengalihan
kepemilikan komunitas harus dilakukan oleh administrator terlebih dahulu.

## Membersihkan data akun terdaftar

Skrip berikut menghapus data dan foto milik semua akun non-admin, termasuk pemimpin
komunitas, tetapi mempertahankan akun agar tetap dapat login. Data CRUD aplikasi
admin dan akun admin tidak dihapus. Skrip berjalan dalam mode simulasi secara default.

1. Pastikan migrasi Supabase di atas sudah diterapkan.
2. Simpan `SUPABASE_SERVICE_ROLE_KEY` secara lokal di `.env.local`. Jangan bagikan
   kunci ini atau memasukkannya ke repositori.
3. Tinjau jumlah data yang akan dihapus:

   ```sh
   npx tsx scripts/cleanup-registered-user-data.ts
   ```

4. Jika jumlahnya sudah benar, jalankan penghapusan permanen:

   ```sh
   npx tsx scripts/cleanup-registered-user-data.ts --apply
   ```

Skrip menghapus utas pengguna langsung dari database. Setelah aplikasi versi terbaru
diterapkan, penanda reset akun membersihkan cache lokal lama saat masing-masing akun masuk
kembali agar utas dan aktivitas yang sudah dibersihkan tidak diunggah lagi. Kredensial
service role hanya digunakan oleh skrip lokal ini.
