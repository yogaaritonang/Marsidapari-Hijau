
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

The second migration repairs the challenge-proof upload policy and moves leaderboard
cheer writes to a database function that validates the signed-in account.
The frontend also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Data
changes will not sync across devices until the migration is applied and the app is
connected to that same Supabase project.

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
