-- Phase 4: Trace Forever (one-time unlock, shared by the couple).
-- premium is set only by the RevenueCat webhook (service role) — members can
-- read it via the existing couples select policy but never write it.

alter table public.couples
  add column premium boolean not null default false,
  add column premium_at timestamptz;

-- invisible ink is a premium brush
alter table public.strokes drop constraint strokes_brush_check;
alter table public.strokes add constraint strokes_brush_check
  check (brush in ('marker','glow','neon','chalk','invisible'));

-- free tier: one photo canvas per day per couple (UTC days, like daily_marks)
create or replace function public.enforce_photo_daily_limit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.kind = 'photo'
     and not (select premium from couples where id = new.couple_id)
     and (select count(*) from canvases
            where couple_id = new.couple_id
              and kind = 'photo'
              and created_at >= date_trunc('day', now())) >= 1 then
    raise exception 'Free plan allows one photo canvas per day — Trace Forever unlocks unlimited photos';
  end if;
  return new;
end;
$$;

create trigger photo_daily_limit
  before insert on public.canvases
  for each row execute function public.enforce_photo_daily_limit();
