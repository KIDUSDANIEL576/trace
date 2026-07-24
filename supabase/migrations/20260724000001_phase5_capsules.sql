-- Phase 5 · Time Capsules — draw something, seal it until a date.
-- Two tables so RLS can time-gate the CONTENT while the metadata (that a
-- sealed capsule exists, and when it opens) stays visible to both partners:
-- anticipation is the feature.
--
-- Write model (hardened after adversarial review):
--   * ALL writes go through seal_capsule() — one atomic SECURITY DEFINER
--     transaction, so a half-written "hollow" capsule can't exist.
--   * Clients keep only SELECT plus UPDATE(opened_at) (column-level grant).
--     A plain UPDATE policy would let a member rewrite opens_at and unseal
--     early — the column grant is what makes the time gate real.

create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  author_id uuid not null,
  note text,                                   -- short message shown on open
  opens_at timestamptz not null,
  opened_at timestamptz,                       -- set client-side on first open
  created_at timestamptz default now()
);

create table public.capsule_contents (
  capsule_id uuid primary key references public.capsules(id) on delete cascade,
  strokes jsonb not null                       -- [{brush,color,width,points}, ...]
);

alter table public.capsules enable row level security;
alter table public.capsule_contents enable row level security;

revoke insert, update, delete on public.capsules from authenticated, anon;
grant update (opened_at) on public.capsules to authenticated;
revoke insert, update, delete on public.capsule_contents from authenticated, anon;

-- metadata: both partners always see that a capsule exists + when it opens
create policy "capsule members read" on public.capsules
  for select to authenticated using (public.is_couple_member(couple_id));
-- rows a member may touch; the column grant above limits WHICH column
create policy "capsule members mark opened" on public.capsules
  for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- content: sealed until opens_at for EVERYONE — the author can't peek either;
-- that's what makes sealing it mean something
create policy "capsule content readable when open" on public.capsule_contents
  for select to authenticated using (
    exists (
      select 1 from public.capsules c
      where c.id = capsule_id
        and public.is_couple_member(c.couple_id)
        and c.opens_at <= now()
    )
  );

create or replace function public.seal_capsule(
  p_couple_id uuid,
  p_opens_at timestamptz,
  p_strokes jsonb,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
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

  insert into capsules (couple_id, author_id, note, opens_at)
  values (p_couple_id, auth.uid(), nullif(trim(p_note), ''), p_opens_at)
  returning id into v_id;

  insert into capsule_contents (capsule_id, strokes)
  values (v_id, p_strokes);

  return v_id;
end $$;

revoke execute on function public.seal_capsule(uuid, timestamptz, jsonb, text) from anon, public;

create index capsules_couple_opens_idx on public.capsules (couple_id, opens_at);
