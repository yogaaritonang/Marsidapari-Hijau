insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mh-user-media',
  'mh-user-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own shared media" on storage.objects;
create policy "Users can view their own shared media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'mh-user-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their own shared media" on storage.objects;
create policy "Users can upload their own shared media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mh-user-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can replace their own shared media" on storage.objects;
create policy "Users can replace their own shared media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'mh-user-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'mh-user-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
