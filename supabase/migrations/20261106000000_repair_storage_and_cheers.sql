insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mh-challenge-proofs',
  'mh-challenge-proofs',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own challenge proofs" on storage.objects;
create policy "Users can view their own challenge proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'mh-challenge-proofs'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their own challenge proofs" on storage.objects;
create policy "Users can upload their own challenge proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mh-challenge-proofs'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can replace their own challenge proofs" on storage.objects;
create policy "Users can replace their own challenge proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'mh-challenge-proofs'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'mh-challenge-proofs'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create table if not exists public.mh_leaderboard_cheers (
  target_user_id uuid not null references auth.users(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (target_user_id, sender_user_id),
  check (target_user_id <> sender_user_id)
);

alter table public.mh_leaderboard_cheers enable row level security;

drop policy if exists "Authenticated users can view leaderboard cheers" on public.mh_leaderboard_cheers;
create policy "Authenticated users can view leaderboard cheers"
  on public.mh_leaderboard_cheers for select to authenticated
  using (true);

create or replace function public.mh_toggle_leaderboard_cheer(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if p_target_user_id is null or p_target_user_id = current_user_id then
    raise exception 'A valid different leaderboard member is required.';
  end if;

  delete from public.mh_leaderboard_cheers
    where target_user_id = p_target_user_id
      and sender_user_id = current_user_id;

  if not found then
    insert into public.mh_leaderboard_cheers (target_user_id, sender_user_id)
    values (p_target_user_id, current_user_id);
  end if;
end;
$$;

revoke all on function public.mh_toggle_leaderboard_cheer(uuid) from public, anon;
grant execute on function public.mh_toggle_leaderboard_cheer(uuid) to authenticated;

create or replace function public.mh_leaderboard_cheer_counts()
returns table (
  target_user_id uuid,
  cheer_count bigint,
  cheered_by_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  select cheers.target_user_id,
         count(*) as cheer_count,
         bool_or(cheers.sender_user_id = (select auth.uid())) as cheered_by_current_user
  from public.mh_leaderboard_cheers as cheers
  group by cheers.target_user_id;
$$;

revoke all on function public.mh_leaderboard_cheer_counts() from public, anon;
grant execute on function public.mh_leaderboard_cheer_counts() to authenticated;

create table if not exists public.mh_submissions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id text not null,
  verdict text not null check (verdict in ('valid', 'perlu_tinjauan', 'tidak_valid')),
  awarded_points integer not null default 0 check (awarded_points >= 0),
  submitted_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  reviewed_by text
);

alter table public.mh_submissions enable row level security;

drop policy if exists "Users and leaders can read permitted submissions" on public.mh_submissions;
create policy "Users and leaders can read permitted submissions"
  on public.mh_submissions for select to authenticated
  using (
    user_id = (select auth.uid())
    or verdict = 'valid'
    or public.mh_is_admin()
    or (
      public.mh_is_leader()
      and community_id = public.mh_organization_id()
    )
  );

drop policy if exists "Users can submit their own activity" on public.mh_submissions;
create policy "Users can submit their own activity"
  on public.mh_submissions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and payload ->> 'userId' = (select auth.uid())::text
    and payload ->> 'id' = id
  );

grant select, insert, update on public.mh_submissions to authenticated;

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
