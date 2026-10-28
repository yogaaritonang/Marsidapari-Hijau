revoke all on table public.mh_records from anon;
grant select on table public.mh_records to anon;

drop policy if exists "Anyone can view approved map locations" on public.mh_records;
create policy "Anyone can view approved map locations"
  on public.mh_records for select to anon
  using (
    collection = 'locations'
    and coalesce(payload ->> 'approvalStatus', 'approved') = 'approved'
    and payload ->> '_deleted' is distinct from 'true'
  );

drop policy if exists "Users can read permitted application records" on public.mh_records;
create policy "Users can read permitted application records"
  on public.mh_records for select to authenticated
  using (
    public.mh_is_admin()
    or owner_id = auth.uid()
    or (organization_id is not null and organization_id = public.mh_organization_id())
    or collection in ('brand', 'challenges', 'communities', 'devotions', 'events', 'reports')
    or (
      collection = 'locations'
      and payload ->> '_deleted' is distinct from 'true'
      and (
        coalesce(payload ->> 'approvalStatus', 'approved') = 'approved'
        or public.mh_is_leader()
      )
    )
  );

drop policy if exists "Members can propose bank waste locations" on public.mh_records;
create policy "Members can propose bank waste locations"
  on public.mh_records for insert to authenticated
  with check (
    collection = 'locations'
    and owner_id = auth.uid()
    and payload ->> 'id' = record_id
    and not (payload ? 'submittedBy')
    and payload ->> 'category' = 'bank_sampah'
    and payload ->> 'approvalStatus' = 'pending'
    and case
      when jsonb_typeof(payload -> 'coordinates') is distinct from 'array' then false
      when jsonb_array_length(payload -> 'coordinates') <> 2 then false
      when jsonb_typeof(payload -> 'coordinates' -> 0) is distinct from 'number' then false
      when jsonb_typeof(payload -> 'coordinates' -> 1) is distinct from 'number' then false
      else
        (payload -> 'coordinates' ->> 0)::numeric between -90 and 90
        and (payload -> 'coordinates' ->> 1)::numeric between -180 and 180
    end
  );

drop policy if exists "Admins and organization leaders can review map locations" on public.mh_records;
create policy "Admins and organization leaders can review map locations"
  on public.mh_records for update to authenticated
  using (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection = 'locations'
      and payload ->> 'approvalStatus' = 'pending'
    )
  )
  with check (
    public.mh_is_admin()
    or (
      public.mh_is_leader()
      and collection = 'locations'
      and payload ->> 'approvalStatus' in ('approved', 'rejected')
      and owner_id is not null
      and not (payload ? 'submittedBy')
    )
  );
