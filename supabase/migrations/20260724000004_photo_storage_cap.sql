-- Fair-use ceiling on photo storage.
--
-- Trace Forever is a ONE-TIME purchase, but storage cost recurs forever, so an
-- unbounded bucket is the single place where one couple could outrun what they
-- paid. The numbers, honestly:
--
--   Normal heavy use — a photo every day — reaches 5,000 after ~13 years, and
--   costs a couple of dollars in storage across that whole span. The cap is not
--   there for them.
--   Abuse — using Trace as free cloud storage — reaches it in days, and at
--   100 GB would cost ~$25/year forever against a single $29.99 payment.
--
-- Enforced as a trigger on storage.objects so it holds regardless of which
-- client uploads. Covers photo canvases AND custom sky backgrounds, since both
-- live under photos/{couple_id}/.

create or replace function public.enforce_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_couple text;
  v_count  int;
  v_bytes  bigint;
begin
  if new.bucket_id <> 'photos' then
    return new;
  end if;

  v_couple := split_part(new.name, '/', 1);
  if v_couple = '' then
    return new;
  end if;

  select count(*), coalesce(sum(nullif(metadata->>'size','')::bigint), 0)
    into v_count, v_bytes
    from storage.objects
   where bucket_id = 'photos'
     and name like v_couple || '/%';

  if v_count >= 5000 then
    raise exception 'photo_cap_count';
  end if;
  if v_bytes >= 10737418240 then -- 10 GiB
    raise exception 'photo_cap_bytes';
  end if;

  return new;
end $$;

drop trigger if exists photo_cap on storage.objects;
create trigger photo_cap
  before insert on storage.objects
  for each row execute function public.enforce_photo_cap();

revoke execute on function public.enforce_photo_cap() from anon, authenticated, public;
