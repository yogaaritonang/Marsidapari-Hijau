-- Migration: Fix Row-Level Security (RLS) for mh_records
-- Allows authorized users (members & leaders) to insert and synchronize their activity records,
-- proposals (bank sampah & area reboisasi), reports, events, and community updates without HTTP 403 errors.

-- 1. Drop outdated/overly restrictive insert policies
drop policy if exists "Members can propose bank waste locations" on public.mh_records;
drop policy if exists "Users can create permitted application records" on public.mh_records;

-- 2. Create updated, robust insert policy for authenticated users
create policy "Users can create permitted application records"
  on public.mh_records for insert to authenticated
  with check (
    -- System Administrators can insert any record
    public.mh_is_admin()

    -- Organization Leaders can insert events, reports, and community records
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )

    -- Authenticated members can submit environmental reports
    or (
      collection = 'reports'
      and (owner_id = auth.uid() or owner_id is null)
    )

    -- Authenticated members can propose map locations across all valid categories
    -- (bank_sampah, tanam_pohon / area reboisasi, bersih_danau, mata_air)
    or (
      collection = 'locations'
      and (owner_id = auth.uid() or owner_id is null)
      and payload ->> 'id' = record_id
      and payload ->> 'category' in ('bank_sampah', 'tanam_pohon', 'bersih_danau', 'mata_air')
      and case
        when jsonb_typeof(payload -> 'coordinates') is distinct from 'array' then false
        when jsonb_array_length(payload -> 'coordinates') <> 2 then false
        when jsonb_typeof(payload -> 'coordinates' -> 0) is distinct from 'number' then false
        when jsonb_typeof(payload -> 'coordinates' -> 1) is distinct from 'number' then false
        else
          (payload -> 'coordinates' ->> 0)::numeric between -90 and 90
          and (payload -> 'coordinates' ->> 1)::numeric between -180 and 180
      end
    )

    -- Authenticated users can insert community discussions & threads
    or (
      collection = 'threads'
      and (owner_id = auth.uid() or owner_id is null)
    )
  );

-- 3. Update the update policy so leaders and record owners can update their records
drop policy if exists "Admins and organization leaders can update records" on public.mh_records;
drop policy if exists "Admins and organization leaders can review map locations" on public.mh_records;

create policy "Admins and organization leaders can update records"
  on public.mh_records for update to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      owner_id = auth.uid()
      and collection in ('reports', 'locations', 'threads')
    )
  )
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection in ('events', 'reports', 'communities', 'locations')
    )
    or (
      owner_id = auth.uid()
      and collection in ('reports', 'locations', 'threads')
    )
  );

-- 4. Update the select policy to ensure all active app collections are readable by authenticated users
drop policy if exists "Users can read permitted application records" on public.mh_records;

create policy "Users can read permitted application records"
  on public.mh_records for select to authenticated
  using (
    public.mh_is_admin()
    or owner_id = auth.uid()
    or (organization_id is not null and organization_id = public.mh_organization_id())
    or collection in ('brand', 'challenges', 'communities', 'devotions', 'events', 'locations', 'reports', 'threads')
  );
