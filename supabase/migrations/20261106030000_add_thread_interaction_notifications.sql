create or replace function public.mh_notify_thread_interactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_owner_id uuid;
  actor_id uuid;
  actor_name text;
  interaction jsonb;
  notification_id text;
  notification_time timestamptz;
  actor_id_text text;
begin
  if new.collection <> 'threads' then
    return new;
  end if;

  actor_id_text := coalesce(new.owner_id::text, new.payload ->> 'userId');
  if actor_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return new;
  end if;
  thread_owner_id := actor_id_text::uuid;

  for actor_id_text in
    select new_likes.liker_id
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(new.payload -> 'likedBy') = 'array' then new.payload -> 'likedBy'
        else '[]'::jsonb
      end
    ) as new_likes(liker_id)
    where new_likes.liker_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and not exists (
         select 1
         from jsonb_array_elements_text(
           case
             when jsonb_typeof(old.payload -> 'likedBy') = 'array' then old.payload -> 'likedBy'
             else '[]'::jsonb
           end
         ) as previous_likes(liker_id)
         where previous_likes.liker_id = new_likes.liker_id
       )
  loop
    actor_id := actor_id_text::uuid;
    if actor_id = thread_owner_id then
      continue;
    end if;

    select coalesce(
      account.raw_user_meta_data ->> 'name',
      account.raw_user_meta_data ->> 'full_name',
      'Pengguna'
    )
    into actor_name
    from auth.users as account
    where account.id = actor_id;

    notification_time := clock_timestamp();
    notification_id := 'thread-like:' || new.record_id || ':' || gen_random_uuid()::text;
    insert into public.mh_social_notifications (
      id, recipient_user_id, sender_user_id, payload, created_at, is_read, is_broadcast
    )
    values (
      notification_id,
      thread_owner_id,
      actor_id,
      jsonb_build_object(
        'id', notification_id,
        'recipientUserId', thread_owner_id::text,
        'senderUserId', actor_id::text,
        'senderName', coalesce(actor_name, 'Pengguna'),
        'type', 'thread_like',
        'targetId', new.record_id,
        'title', 'Postingan disukai',
        'message', coalesce(actor_name, 'Pengguna') || ' menyukai postingan Anda.',
        'createdAt', notification_time,
        'read', false
      ),
      notification_time,
      false,
      false
    )
    on conflict (id) do nothing;
  end loop;

  for interaction in
    select new_replies.reply_data
    from jsonb_array_elements(
      case
        when jsonb_typeof(new.payload -> 'replies') = 'array' then new.payload -> 'replies'
        else '[]'::jsonb
      end
    ) as new_replies(reply_data)
    where nullif(new_replies.reply_data ->> 'id', '') is not null
      and not exists (
        select 1
        from jsonb_array_elements(
          case
            when jsonb_typeof(old.payload -> 'replies') = 'array' then old.payload -> 'replies'
            else '[]'::jsonb
          end
        ) as previous_replies(reply_data)
        where previous_replies.reply_data ->> 'id' = new_replies.reply_data ->> 'id'
      )
  loop
    actor_id_text := interaction ->> 'userId';
    if actor_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      continue;
    end if;
    actor_id := actor_id_text::uuid;
    if actor_id = thread_owner_id then
      continue;
    end if;

    actor_name := coalesce(interaction ->> 'userName', 'Pengguna');
    notification_time := clock_timestamp();
    notification_id := 'thread-reply:' || (interaction ->> 'id');
    insert into public.mh_social_notifications (
      id, recipient_user_id, sender_user_id, payload, created_at, is_read, is_broadcast
    )
    values (
      notification_id,
      thread_owner_id,
      actor_id,
      jsonb_build_object(
        'id', notification_id,
        'recipientUserId', thread_owner_id::text,
        'senderUserId', actor_id::text,
        'senderName', actor_name,
        'type', 'thread_reply',
        'targetId', new.record_id,
        'title', 'Balasan baru',
        'message', actor_name || ' membalas postingan Anda.',
        'createdAt', notification_time,
        'read', false
      ),
      notification_time,
      false,
      false
    )
    on conflict (id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists mh_notify_thread_interactions on public.mh_records;
create trigger mh_notify_thread_interactions
  after update of payload on public.mh_records
  for each row
  when (new.collection = 'threads')
  execute function public.mh_notify_thread_interactions();
