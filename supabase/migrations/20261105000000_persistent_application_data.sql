alter table public.mh_records
  drop constraint if exists mh_records_collection_check;

alter table public.mh_records
  add constraint mh_records_collection_check
  check (
    collection in (
      'brand',
      'challenges',
      'communities',
      'devotions',
      'events',
      'locations',
      'reports',
      'threads',
      'ecotheology'
    )
  );

create table if not exists public.mh_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  community_id text not null default 'umum',
  profile jsonb not null default '{}'::jsonb,
  garden jsonb,
  favorite_devotion_ids text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

alter table public.mh_user_profiles enable row level security;

drop policy if exists "Users can read their private application profile" on public.mh_user_profiles;
create policy "Users can read their private application profile"
  on public.mh_user_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.mh_is_admin());

drop policy if exists "Users can create their private application profile" on public.mh_user_profiles;
create policy "Users can create their private application profile"
  on public.mh_user_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their private application profile" on public.mh_user_profiles;
create policy "Users can update their private application profile"
  on public.mh_user_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.mh_user_profiles to authenticated;

create table if not exists public.mh_community_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  community_id text not null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mh_community_memberships_community_idx
  on public.mh_community_memberships (community_id);

alter table public.mh_community_memberships enable row level security;

drop policy if exists "Authenticated users can view community membership counts" on public.mh_community_memberships;
create policy "Authenticated users can view community membership counts"
  on public.mh_community_memberships for select to authenticated
  using (true);

drop policy if exists "Users can join a community" on public.mh_community_memberships;
create policy "Users can join a community"
  on public.mh_community_memberships for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can change their community membership" on public.mh_community_memberships;
create policy "Users can change their community membership"
  on public.mh_community_memberships for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.mh_community_memberships to authenticated;

create or replace function public.mh_community_member_counts()
returns table (community_id text, member_count bigint)
language sql
security invoker
set search_path = public
as $$
  select memberships.community_id, count(*)
  from public.mh_community_memberships as memberships
  group by memberships.community_id;
$$;

grant execute on function public.mh_community_member_counts() to authenticated;

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

create index if not exists mh_submissions_user_idx
  on public.mh_submissions (user_id, submitted_at desc);
create index if not exists mh_submissions_community_idx
  on public.mh_submissions (community_id, verdict, submitted_at desc);

create or replace function public.mh_validate_submission_award()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  challenge_points integer;
begin
  if new.payload ->> 'id' is distinct from new.id
     or new.payload ->> 'userId' is distinct from new.user_id::text
     or new.payload ->> 'verdict' is distinct from new.verdict
     or (new.payload ->> 'awardedPoints')::integer is distinct from new.awarded_points then
    raise exception 'Submission fields do not match the stored activity.';
  end if;

  select (challenge_record.payload ->> 'points')::integer
    into challenge_points
    from public.mh_records as challenge_record
    where challenge_record.collection = 'challenges'
      and challenge_record.record_id = new.payload ->> 'challengeId';

  if challenge_points is null then
    raise exception 'The referenced challenge is not available in the shared database.';
  end if;

  if (new.verdict = 'valid' and new.awarded_points <> challenge_points)
     or (new.verdict <> 'valid' and new.awarded_points <> 0) then
    raise exception 'Awarded points do not match the challenge result.';
  end if;

  return new;
end;
$$;

drop trigger if exists mh_submissions_validate_award on public.mh_submissions;
create trigger mh_submissions_validate_award
  before insert or update on public.mh_submissions
  for each row execute function public.mh_validate_submission_award();

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

drop policy if exists "Leaders and admins can review activity" on public.mh_submissions;
create policy "Leaders and admins can review activity"
  on public.mh_submissions for update to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and community_id = public.mh_organization_id()
    )
  )
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and community_id = public.mh_organization_id()
    )
  );

grant select, insert, update on public.mh_submissions to authenticated;

create table if not exists public.mh_social_notifications (
  id text primary key,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false,
  is_broadcast boolean not null default false,
  read_by uuid[] not null default '{}'::uuid[],
  check ((is_broadcast and recipient_user_id is null) or (not is_broadcast and recipient_user_id is not null))
);

create index if not exists mh_social_notifications_recipient_idx
  on public.mh_social_notifications (recipient_user_id, created_at desc);

alter table public.mh_social_notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.mh_social_notifications;
create policy "Users can read their notifications"
  on public.mh_social_notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()) or is_broadcast);

drop policy if exists "Users can create notifications they send" on public.mh_social_notifications;
create policy "Users can create notifications they send"
  on public.mh_social_notifications for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and ((is_broadcast and recipient_user_id is null) or (not is_broadcast and recipient_user_id is not null))
  );

drop policy if exists "Users can mark their notifications read" on public.mh_social_notifications;
revoke update on public.mh_social_notifications from authenticated;

grant select, insert on public.mh_social_notifications to authenticated;

create or replace function public.mh_mark_notifications_read(notification_ids text[] default null)
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

  update public.mh_social_notifications
    set is_read = true
    where recipient_user_id = current_user_id
      and (notification_ids is null or id = any(notification_ids));

  update public.mh_social_notifications
    set read_by = case
      when current_user_id = any(read_by) then read_by
      else array_append(read_by, current_user_id)
    end
    where is_broadcast
      and (notification_ids is null or id = any(notification_ids));
end;
$$;

revoke all on function public.mh_mark_notifications_read(text[]) from public, anon;
grant execute on function public.mh_mark_notifications_read(text[]) to authenticated;

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

drop policy if exists "Users can cheer from their own account" on public.mh_leaderboard_cheers;
create policy "Users can cheer from their own account"
  on public.mh_leaderboard_cheers for insert to authenticated
  with check (sender_user_id = (select auth.uid()));

drop policy if exists "Users can remove their own cheers" on public.mh_leaderboard_cheers;
create policy "Users can remove their own cheers"
  on public.mh_leaderboard_cheers for delete to authenticated
  using (sender_user_id = (select auth.uid()));

grant select, insert, delete on public.mh_leaderboard_cheers to authenticated;

create or replace function public.mh_leaderboard_cheer_counts()
returns table (
  target_user_id uuid,
  cheer_count bigint,
  cheered_by_current_user boolean
)
language sql
security invoker
set search_path = public
as $$
  select cheers.target_user_id,
         count(*),
         bool_or(cheers.sender_user_id = (select auth.uid()))
  from public.mh_leaderboard_cheers as cheers
  group by cheers.target_user_id;
$$;

grant execute on function public.mh_leaderboard_cheer_counts() to authenticated;

create table if not exists public.mh_event_registrations (
  event_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.mh_event_registrations enable row level security;

drop policy if exists "Authenticated users can view event registrations" on public.mh_event_registrations;
create policy "Authenticated users can view event registrations"
  on public.mh_event_registrations for select to authenticated
  using (true);

drop policy if exists "Users can register themselves for events" on public.mh_event_registrations;
create policy "Users can register themselves for events"
  on public.mh_event_registrations for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can cancel their event registration" on public.mh_event_registrations;
create policy "Users can cancel their event registration"
  on public.mh_event_registrations for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.mh_event_registrations to authenticated;

create or replace function public.mh_event_registration_counts()
returns table (event_id text, registration_count bigint)
language sql
security invoker
set search_path = public
as $$
  select registrations.event_id, count(*)
  from public.mh_event_registrations as registrations
  group by registrations.event_id;
$$;

grant execute on function public.mh_event_registration_counts() to authenticated;

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

drop policy if exists "Users can upload their own challenge proofs" on storage.objects;
create policy "Users can upload their own challenge proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mh-challenge-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

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

drop policy if exists "Users can replace their own challenge proofs" on storage.objects;
create policy "Users can replace their own challenge proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'mh-challenge-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'mh-challenge-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create or replace function public.mh_protect_shared_thread_content()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.collection <> 'threads' or public.mh_is_admin() then
    return new;
  end if;

  if new.payload ->> '_deleted' = 'true' then
    if old.owner_id is distinct from (select auth.uid()) then
      raise exception 'Only the thread author can delete this thread.';
    end if;
    return new;
  end if;

  if old.owner_id = (select auth.uid()) then
    return new;
  end if;

  if public.mh_is_leader()
     and old.organization_id = public.mh_organization_id()
     and (new.payload - 'status' - 'likes' - 'likedBy' - 'replies' - 'savedBy')
       is not distinct from
       (old.payload - 'status' - 'likes' - 'likedBy' - 'replies' - 'savedBy')
     and new.owner_id is not distinct from old.owner_id
     and new.organization_id is not distinct from old.organization_id then
    return new;
  end if;

  if (new.payload - 'likes' - 'likedBy' - 'replies' - 'savedBy')
      is distinct from
     (old.payload - 'likes' - 'likedBy' - 'replies' - 'savedBy')
     or new.owner_id is distinct from old.owner_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'Thread content can only be changed by its author.';
  end if;

  return new;
end;
$$;

drop trigger if exists mh_records_protect_shared_thread_content on public.mh_records;
create trigger mh_records_protect_shared_thread_content
  before update on public.mh_records
  for each row execute function public.mh_protect_shared_thread_content();

drop policy if exists "Users can insert permitted shared records" on public.mh_records;
drop policy if exists "Users can create permitted application records" on public.mh_records;
create policy "Users can insert permitted shared records"
  on public.mh_records for insert to authenticated
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      collection = 'threads'
      and owner_id = (select auth.uid())
      and payload ->> 'userId' = (select auth.uid())::text
    )
    or (
      collection = 'reports'
      and (owner_id = (select auth.uid()) or owner_id is null)
    )
    or (
      collection = 'locations'
      and (owner_id = (select auth.uid()) or owner_id is null)
      and payload ->> 'id' = record_id
      and payload ->> 'category' in ('bank_sampah', 'tanam_pohon', 'bersih_danau', 'mata_air')
      and case
        when jsonb_typeof(payload -> 'coordinates') is distinct from 'array' then false
        when jsonb_array_length(payload -> 'coordinates') <> 2 then false
        else
          jsonb_typeof(payload -> 'coordinates' -> 0) = 'number'
          and jsonb_typeof(payload -> 'coordinates' -> 1) = 'number'
          and (payload -> 'coordinates' ->> 0)::numeric between -90 and 90
          and (payload -> 'coordinates' ->> 1)::numeric between -180 and 180
      end
    )
  );

drop policy if exists "Admins leaders and owners can update permitted records" on public.mh_records;
drop policy if exists "Admins and organization leaders can update records" on public.mh_records;
create policy "Admins leaders and owners can update permitted records"
  on public.mh_records for update to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      owner_id = (select auth.uid())
      and collection in ('reports', 'locations', 'threads')
    )
    or collection = 'threads'
  )
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      owner_id = (select auth.uid())
      and collection in ('reports', 'locations', 'threads')
    )
    or collection = 'threads'
  );

drop policy if exists "Admins leaders and thread owners can delete records" on public.mh_records;
drop policy if exists "Admins and organization leaders can delete records" on public.mh_records;
create policy "Admins leaders and thread owners can delete records"
  on public.mh_records for delete to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      collection = 'threads'
      and owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read permitted application records" on public.mh_records;
create policy "Users can read permitted application records"
  on public.mh_records for select to authenticated
  using (
    public.mh_is_admin()
    or owner_id = (select auth.uid())
    or (
      organization_id is not null
      and organization_id = public.mh_organization_id()
    )
    or collection in (
      'brand',
      'challenges',
      'communities',
      'devotions',
      'events',
      'locations',
      'reports',
      'threads',
      'ecotheology'
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.mh_records;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.mh_submissions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
