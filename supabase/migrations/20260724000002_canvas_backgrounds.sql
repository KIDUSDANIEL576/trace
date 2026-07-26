-- Canvas backgrounds — the couple picks the "sky" they draw on, and how
-- strongly it shows. Additive columns on canvases; existing rows keep the
-- default dusk gradient at full strength, so nothing changes for anyone.

alter table public.canvases
  add column if not exists bg_key text default 'dusk',
  add column if not exists bg_photo_url text,          -- storage path when the bg is a photo
  add column if not exists bg_opacity real default 1;

alter table public.canvases
  add constraint canvases_bg_opacity_range check (bg_opacity >= 0.15 and bg_opacity <= 1);

-- Members can already select/insert canvases (init migration). Updating the
-- background is a normal member action on their own couple's canvas.
create policy "canvas members update background" on public.canvases
  for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
