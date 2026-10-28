insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.mh_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_path text not null,
  updated_at timestamptz not null default now(),
  constraint mh_public_profiles_avatar_path_owner_check
    check (avatar_path like user_id::text || '/%')
);

alter table public.mh_public_profiles enable row level security;

drop policy if exists "Anyone can view public profile photos" on public.mh_public_profiles;
create policy "Anyone can view public profile photos"
  on public.mh_public_profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can add their own profile photo" on public.mh_public_profiles;
create policy "Users can add their own profile photo"
  on public.mh_public_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile photo" on public.mh_public_profiles;
create policy "Users can update their own profile photo"
  on public.mh_public_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own profile photo" on public.mh_public_profiles;
create policy "Users can remove their own profile photo"
  on public.mh_public_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.mh_public_profiles to anon, authenticated;
grant insert, update, delete on public.mh_public_profiles to authenticated;

drop policy if exists "Users can upload their own profile photos" on storage.objects;
create policy "Users can upload their own profile photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own profile photos" on storage.objects;
create policy "Users can delete their own profile photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
