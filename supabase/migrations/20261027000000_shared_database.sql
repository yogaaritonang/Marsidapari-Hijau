create table if not exists public.mh_organizations (
  id text primary key,
  name text not null,
  category text not null,
  location text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.mh_records (
  collection text not null check (
    collection in ('brand', 'challenges', 'communities', 'devotions', 'events', 'locations', 'reports')
  ),
  record_id text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  organization_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, record_id)
);

create index if not exists mh_records_owner_idx on public.mh_records (owner_id);
create index if not exists mh_records_organization_idx on public.mh_records (organization_id);
create index if not exists mh_records_collection_idx on public.mh_records (collection);

create or replace function public.mh_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

create or replace function public.mh_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'pemimpin', false);
$$;

create or replace function public.mh_organization_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select auth.jwt() -> 'app_metadata' ->> 'organization_id';
$$;

alter table public.mh_organizations enable row level security;
alter table public.mh_records enable row level security;

drop policy if exists "Authenticated users can view organizations" on public.mh_organizations;
create policy "Authenticated users can view organizations"
  on public.mh_organizations for select to authenticated
  using (true);

drop policy if exists "Admins can create organizations" on public.mh_organizations;
create policy "Admins can create organizations"
  on public.mh_organizations for insert to authenticated
  with check (public.mh_is_admin());

drop policy if exists "Admins and organization owners can update organizations" on public.mh_organizations;
create policy "Admins and organization owners can update organizations"
  on public.mh_organizations for update to authenticated
  using (
    public.mh_is_admin()
    or (public.mh_is_leader() and owner_id = auth.uid() and id = public.mh_organization_id())
  )
  with check (
    public.mh_is_admin()
    or (public.mh_is_leader() and owner_id = auth.uid() and id = public.mh_organization_id())
  );

drop policy if exists "Admins can delete organizations" on public.mh_organizations;
create policy "Admins can delete organizations"
  on public.mh_organizations for delete to authenticated
  using (public.mh_is_admin());

drop policy if exists "Users can read permitted application records" on public.mh_records;
create policy "Users can read permitted application records"
  on public.mh_records for select to authenticated
  using (
    public.mh_is_admin()
    or owner_id = auth.uid()
    or (organization_id is not null and organization_id = public.mh_organization_id())
    or collection in ('brand', 'challenges', 'communities', 'devotions', 'events', 'locations', 'reports')
  );

drop policy if exists "Users can create permitted application records" on public.mh_records;
create policy "Users can create permitted application records"
  on public.mh_records for insert to authenticated
  with check (
    public.mh_is_admin()
    or (
      collection = 'reports'
      and owner_id = auth.uid()
      and (auth.jwt() -> 'app_metadata' ->> 'role' is null or auth.jwt() -> 'app_metadata' ->> 'role' = 'anggota')
    )
    or (
      public.mh_is_leader()
      and organization_id = public.mh_organization_id()
      and collection in ('events', 'reports')
    )
  );

drop policy if exists "Admins and organization leaders can update records" on public.mh_records;
create policy "Admins and organization leaders can update records"
  on public.mh_records for update to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and organization_id = public.mh_organization_id()
      and collection in ('events', 'reports')
    )
  )
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and organization_id = public.mh_organization_id()
      and collection in ('events', 'reports')
    )
  );

drop policy if exists "Admins and organization leaders can delete records" on public.mh_records;
create policy "Admins and organization leaders can delete records"
  on public.mh_records for delete to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and organization_id = public.mh_organization_id()
      and collection in ('events', 'reports')
    )
  );

create or replace function public.mh_touch_record_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mh_records_touch_updated_at on public.mh_records;
create trigger mh_records_touch_updated_at
  before update on public.mh_records
  for each row execute function public.mh_touch_record_updated_at();

grant select, insert, update, delete on public.mh_records to authenticated;
grant select, insert, update, delete on public.mh_organizations to authenticated;
