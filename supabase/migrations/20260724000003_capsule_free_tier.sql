-- Free tier: one sealed capsule at a time, opening within about a year.
-- Trace Forever: unlimited capsules, any horizon.
--
-- Enforced HERE rather than only in the client, by reading couples.premium —
-- a column only the RevenueCat webhook (service role) can write. A patched
-- client cannot seal its way around the limit.
--
-- Why free users get a capsule at all: a sealed capsule schedules a return
-- visit months out, which is the strongest retention mechanic in the app.
-- Gating it entirely would mean gating our own reason to come back.

create or replace function public.seal_capsule(
  p_couple_id uuid,
  p_opens_at timestamptz,
  p_strokes jsonb,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_premium boolean;
  v_active int;
begin
  if not public.is_couple_member(p_couple_id) then
    raise exception 'not a member of this couple';
  end if;
  if p_opens_at <= now() then
    raise exception 'opens_at must be in the future';
  end if;
  if p_strokes is null or jsonb_typeof(p_strokes) <> 'array'
     or jsonb_array_length(p_strokes) = 0 then
    raise exception 'strokes required';
  end if;
  if pg_column_size(p_strokes) > 1048576 then
    raise exception 'capsule too large';
  end if;
  if length(coalesce(p_note, '')) > 200 then
    raise exception 'note too long';
  end if;

  select premium into v_premium from couples where id = p_couple_id;

  if not coalesce(v_premium, false) then
    -- 400 days, not 365: "in a year" from a leap-adjacent date must still pass
    if p_opens_at > now() + interval '400 days' then
      raise exception 'free_horizon';
    end if;
    select count(*) into v_active
      from capsules
      where couple_id = p_couple_id and opened_at is null;
    if v_active >= 1 then
      raise exception 'free_limit';
    end if;
  end if;

  insert into capsules (couple_id, author_id, note, opens_at)
  values (p_couple_id, auth.uid(), nullif(trim(p_note), ''), p_opens_at)
  returning id into v_id;

  insert into capsule_contents (capsule_id, strokes)
  values (v_id, p_strokes);

  return v_id;
end $$;

revoke execute on function public.seal_capsule(uuid, timestamptz, jsonb, text) from anon, public;
