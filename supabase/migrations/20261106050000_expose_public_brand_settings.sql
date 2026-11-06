create or replace function public.mh_public_brand_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'name', coalesce(payload -> 'name', '"Marsiadapari Hijau"'::jsonb),
        'logoUrl', coalesce(payload -> 'logoUrl', '""'::jsonb),
        'tagline', payload -> 'tagline',
        'description', payload -> 'description',
        'primaryColor', payload -> 'primaryColor',
        'secondaryColor', payload -> 'secondaryColor',
        'footerText', payload -> 'footerText',
        'contactEmail', payload -> 'contactEmail',
        'contactPhone', payload -> 'contactPhone',
        'facebookUrl', payload -> 'facebookUrl',
        'instagramUrl', payload -> 'instagramUrl',
        'youtubeUrl', payload -> 'youtubeUrl',
        'websiteUrl', payload -> 'websiteUrl',
        'address', payload -> 'address',
        'showChatbot', payload -> 'showChatbot',
        'allowGuestChat', payload -> 'allowGuestChat',
        'launchScreen',
        case
          when jsonb_typeof(payload -> 'launchScreen') = 'object' then jsonb_build_object(
            'enabled', payload -> 'launchScreen' -> 'enabled',
            'title', payload -> 'launchScreen' -> 'title',
            'subtitle', payload -> 'launchScreen' -> 'subtitle',
            'verseText', payload -> 'launchScreen' -> 'verseText',
            'verseRef', payload -> 'launchScreen' -> 'verseRef',
            'logoUrl', payload -> 'launchScreen' -> 'logoUrl',
            'bgGradient', payload -> 'launchScreen' -> 'bgGradient',
            'durationMs', payload -> 'launchScreen' -> 'durationMs',
            'durationSeconds', payload -> 'launchScreen' -> 'durationSeconds'
          )
          else null
        end
      )
      from public.mh_records
      where collection = 'brand'
        and record_id = 'global'
        and payload ->> '_deleted' is distinct from 'true'
      limit 1
    ),
    jsonb_build_object(
      'name', 'Marsiadapari Hijau',
      'logoUrl', '',
      'launchScreen', null
    )
  );
$$;

revoke all on function public.mh_public_brand_settings() from public;
grant execute on function public.mh_public_brand_settings() to anon, authenticated;
