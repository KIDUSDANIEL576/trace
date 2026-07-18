-- Phase 4 follow-up: enforce premium brushes server-side, matching the
-- client gate (free tier: marker + chalk).

create or replace function public.enforce_premium_brush()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.brush in ('glow', 'neon', 'invisible')
     and not coalesce(
       (select c.premium
          from couples c
          join canvases cv on cv.couple_id = c.id
         where cv.id = new.canvas_id),
       false
     ) then
    raise exception 'This brush needs Trace Forever';
  end if;
  return new;
end;
$$;

create trigger premium_brush
  before insert on public.strokes
  for each row execute function public.enforce_premium_brush();
