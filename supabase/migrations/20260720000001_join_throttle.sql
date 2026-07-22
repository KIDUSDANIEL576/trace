-- Throttle invite-code join attempts (10/hour per user) so 6-char codes
-- can't be brute-forced. Attempts land in a service-only table.
--
-- Design note: wrong/full codes RETURN NULL instead of raising — a RAISE
-- would roll back the attempt row (plpgsql exception = rollback of the
-- function's work), so failed joins would never count against the throttle.
-- The client turns null into a friendly error.

create table public.join_attempts (
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);
create index join_attempts_idx on public.join_attempts (user_id, attempted_at desc);
alter table public.join_attempts enable row level security; -- no policies: definer/service only

create or replace function public.join_couple(p_code text, p_display_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_couple uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'You are already in a couple';
  end if;

  -- throttle: 10 attempts per rolling hour
  select count(*) into v_count
    from join_attempts
   where user_id = auth.uid()
     and attempted_at > now() - interval '1 hour';
  if v_count >= 10 then
    raise exception 'Too many attempts — wait a bit and try again';
  end if;
  insert into join_attempts (user_id) values (auth.uid());
  delete from join_attempts where attempted_at < now() - interval '1 day';

  select id into v_couple from couples where invite_code = upper(trim(p_code));
  if v_couple is null then
    return null; -- wrong code: commit so the attempt counts
  end if;

  select count(*) into v_count from members where couple_id = v_couple;
  if v_count >= 2 then
    return null; -- couple full: same handling (and doesn't confirm the code exists)
  end if;

  insert into members (couple_id, user_id, display_name)
  values (v_couple, auth.uid(), nullif(trim(p_display_name), ''));

  return v_couple;
end;
$$;
