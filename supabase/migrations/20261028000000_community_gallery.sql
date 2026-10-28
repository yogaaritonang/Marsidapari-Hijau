insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-gallery',
  'community-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view community gallery photos" on storage.objects;
create policy "Anyone can view community gallery photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'community-gallery');

drop policy if exists "Members can upload their own community gallery photos" on storage.objects;
create policy "Members can upload their own community gallery photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-gallery'
    and split_part(name, '/', 1) = coalesce(
      auth.jwt() -> 'app_metadata' ->> 'organization_id',
      auth.jwt() -> 'user_metadata' ->> 'communityId',
      'umum'
    )
    and split_part(name, '/', 2) like auth.uid()::text || '--%'
  );

drop policy if exists "Members can delete their own community gallery photos" on storage.objects;
create policy "Members can delete their own community gallery photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-gallery'
    and split_part(name, '/', 1) = coalesce(
      auth.jwt() -> 'app_metadata' ->> 'organization_id',
      auth.jwt() -> 'user_metadata' ->> 'communityId',
      'umum'
    )
    and split_part(name, '/', 2) like auth.uid()::text || '--%'
  );
