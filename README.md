
# Marsiadapari Hijau

## Shared application data

Supabase is the shared source of truth for signed-in accounts, community membership,
challenge submissions and points, event registrations, community discussions, and
admin-managed application records. Browser storage remains a cache for the existing
offline experience; it is not the cross-device database.

Before deploying this version, apply
[`20261105000000_persistent_application_data.sql`](./supabase/migrations/20261105000000_persistent_application_data.sql)
to the configured Supabase project (for example, through the Supabase SQL Editor).
The frontend also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Data
changes will not sync across devices until the migration is applied and the app is
connected to that same Supabase project.
