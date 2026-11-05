drop trigger if exists mh_notify_thread_interactions on public.mh_records;

create or replace function public.mh_toggle_thread_like(p_thread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  thread_row public.mh_records%rowtype;
  thread_owner_id uuid;
  liker_ids jsonb;
  updated_payload jsonb;
  actor_name text;
  notification_id text;
  notification_time timestamptz;
  already_liked boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select *
    into thread_row
    from public.mh_records
    where collection = 'threads'
      and record_id = p_thread_id
      and coalesce(payload ->> '_deleted', 'false') <> 'true'
    for update;

  if not found then
    raise exception 'Thread was not found.';
  end if;

  if coalesce(thread_row.owner_id::text, thread_row.payload ->> 'userId')
       !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Thread owner is invalid.';
  end if;
  thread_owner_id := coalesce(thread_row.owner_id::text, thread_row.payload ->> 'userId')::uuid;
  liker_ids := case
    when jsonb_typeof(thread_row.payload -> 'likedBy') = 'array' then thread_row.payload -> 'likedBy'
    else '[]'::jsonb
  end;
  select exists (
    select 1
      from jsonb_array_elements_text(liker_ids) as liked(liker)
      where lower(liker) = lower(current_user_id::text)
  )
    into already_liked;

  if already_liked then
    select coalesce(jsonb_agg(liker), '[]'::jsonb)
      into liker_ids
      from jsonb_array_elements_text(liker_ids) as liked(liker)
      where lower(liker) <> lower(current_user_id::text);
  else
    liker_ids := liker_ids || jsonb_build_array(current_user_id::text);
  end if;

  updated_payload := jsonb_set(
    jsonb_set(thread_row.payload, '{likedBy}', liker_ids, true),
    '{likes}',
    to_jsonb(jsonb_array_length(liker_ids)),
    true
  );
  update public.mh_records
    set payload = updated_payload,
        updated_at = clock_timestamp()
    where collection = 'threads'
      and record_id = p_thread_id;

  if not already_liked and thread_owner_id <> current_user_id then
    select coalesce(
      account.raw_user_meta_data ->> 'name',
      account.raw_user_meta_data ->> 'full_name',
      'Pengguna'
    )
      into actor_name
      from auth.users as account
      where account.id = current_user_id;

    notification_time := clock_timestamp();
    notification_id := 'thread-like:' || p_thread_id || ':' || gen_random_uuid()::text;
    insert into public.mh_social_notifications (
      id, recipient_user_id, sender_user_id, payload, created_at, is_read, is_broadcast
    )
    values (
      notification_id,
      thread_owner_id,
      current_user_id,
      jsonb_build_object(
        'id', notification_id,
        'recipientUserId', thread_owner_id::text,
        'senderUserId', current_user_id::text,
        'senderName', coalesce(actor_name, 'Pengguna'),
        'type', 'thread_like',
        'targetId', p_thread_id,
        'title', 'Postingan disukai',
        'message', coalesce(actor_name, 'Pengguna') || ' menyukai postingan Anda.',
        'createdAt', notification_time,
        'read', false
      ),
      notification_time,
      false,
      false
    );
  end if;

  return updated_payload;
end;
$$;

create or replace function public.mh_add_thread_reply(p_thread_id text, p_reply jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  thread_row public.mh_records%rowtype;
  thread_owner_id uuid;
  replies jsonb;
  updated_payload jsonb;
  actor_name text;
  notification_id text;
  notification_time timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if p_reply is null
     or jsonb_typeof(p_reply) is distinct from 'object'
     or p_reply ->> 'userId' is distinct from current_user_id::text
     or nullif(p_reply ->> 'id', '') is null
     or nullif(btrim(p_reply ->> 'content'), '') is null then
    raise exception 'Reply content is invalid.';
  end if;

  select *
    into thread_row
    from public.mh_records
    where collection = 'threads'
      and record_id = p_thread_id
      and coalesce(payload ->> '_deleted', 'false') <> 'true'
    for update;

  if not found then
    raise exception 'Thread was not found.';
  end if;

  if coalesce(thread_row.owner_id::text, thread_row.payload ->> 'userId')
       !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Thread owner is invalid.';
  end if;
  thread_owner_id := coalesce(thread_row.owner_id::text, thread_row.payload ->> 'userId')::uuid;
  replies := case
    when jsonb_typeof(thread_row.payload -> 'replies') = 'array' then thread_row.payload -> 'replies'
    else '[]'::jsonb
  end;
  if replies @> jsonb_build_array(jsonb_build_object('id', p_reply ->> 'id')) then
    raise exception 'Reply already exists.';
  end if;

  replies := replies || jsonb_build_array(p_reply);
  updated_payload := jsonb_set(thread_row.payload, '{replies}', replies, true);
  update public.mh_records
    set payload = updated_payload,
        updated_at = notification_time
    where collection = 'threads'
      and record_id = p_thread_id;

  if thread_owner_id <> current_user_id then
    actor_name := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'name',
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      'Pengguna'
    );
    notification_id := 'thread-reply:' || (p_reply ->> 'id');
    insert into public.mh_social_notifications (
      id, recipient_user_id, sender_user_id, payload, created_at, is_read, is_broadcast
    )
    values (
      notification_id,
      thread_owner_id,
      current_user_id,
      jsonb_build_object(
        'id', notification_id,
        'recipientUserId', thread_owner_id::text,
        'senderUserId', current_user_id::text,
        'senderName', actor_name,
        'type', 'thread_reply',
        'targetId', p_thread_id,
        'title', 'Balasan baru',
        'message', actor_name || ' membalas postingan Anda.',
        'createdAt', notification_time,
        'read', false
      ),
      notification_time,
      false,
      false
    );
  end if;

  return updated_payload;
end;
$$;

revoke all on function public.mh_toggle_thread_like(text) from public, anon;
revoke all on function public.mh_add_thread_reply(text, jsonb) from public, anon;
grant execute on function public.mh_toggle_thread_like(text) to authenticated;
grant execute on function public.mh_add_thread_reply(text, jsonb) to authenticated;
