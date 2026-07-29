-- Personal pages — "my page / their page", like exchanging letters instead of
-- crowding one whiteboard. A page is a canvas OWNED by one partner: only the
-- owner draws on it; the partner watches it appear live and reads it. The
-- shared canvas stays for drawing together.

alter table public.canvases
  drop constraint if exists canvases_kind_check;
alter table public.canvases
  add constraint canvases_kind_check check (kind in ('shared','photo','page'));
alter table public.canvases
  add column if not exists owner_id uuid;

-- one page per owner per couple
create unique index if not exists canvases_one_page_per_owner
  on public.canvases (couple_id, owner_id) where kind = 'page';

-- Only the page's owner may lay ink on it — enforced here, not just in the UI.
-- RESTRICTIVE: composes with (never widens) the existing membership policy.
drop policy if exists "strokes owner page gate" on public.strokes;
create policy "strokes owner page gate" on public.strokes
  as restrictive for insert to authenticated
  with check (
    not exists (
      select 1 from public.canvases c
      where c.id = canvas_id
        and c.owner_id is not null
        and c.owner_id <> (select auth.uid())
    )
  );

-- Idempotent: each user creates their own page on first visit.
create or replace function public.ensure_my_page(p_couple_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_couple_member(p_couple_id) then
    raise exception 'not a member of this couple';
  end if;
  select id into v_id from canvases
    where couple_id = p_couple_id and kind = 'page' and owner_id = auth.uid();
  if v_id is null then
    insert into canvases (couple_id, kind, owner_id)
    values (p_couple_id, 'page', auth.uid())
    returning id into v_id;
  end if;
  return v_id;
end $$;

revoke execute on function public.ensure_my_page(uuid) from anon, public;
