drop function if exists public.mh_toggle_leaderboard_cheer(uuid);

create function public.mh_toggle_leaderboard_cheer(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  sender_name text := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'name',
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    'Pengguna'
  );
  cheer_added boolean := false;
  notification_id text;
  notification_time timestamptz;
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
    notification_time := clock_timestamp();
    notification_id := 'cheer-' || gen_random_uuid()::text;
    insert into public.mh_leaderboard_cheers (target_user_id, sender_user_id, created_at)
    values (p_target_user_id, current_user_id, notification_time);
    cheer_added := true;

    insert into public.mh_social_notifications (
      id,
      recipient_user_id,
      sender_user_id,
      payload,
      created_at,
      is_read,
      is_broadcast
    )
    values (
      notification_id,
      p_target_user_id,
      current_user_id,
      jsonb_build_object(
        'id', notification_id,
        'recipientUserId', p_target_user_id::text,
        'senderUserId', current_user_id::text,
        'senderName', sender_name,
        'type', 'leaderboard_cheer',
        'targetId', p_target_user_id::text,
        'title', 'Apresiasi baru',
        'message', sender_name || ' mengirimkan apresiasi untuk Anda.',
        'createdAt', notification_time,
        'read', false
      ),
      notification_time,
      false,
      false
    );
  end if;

  return cheer_added;
end;
$$;

revoke all on function public.mh_toggle_leaderboard_cheer(uuid) from public, anon;
grant execute on function public.mh_toggle_leaderboard_cheer(uuid) to authenticated;
