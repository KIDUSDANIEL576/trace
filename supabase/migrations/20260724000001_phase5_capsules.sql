-- Phase 5 · Time Capsules — draw something, seal it until a date.
-- Two tables so RLS can time-gate the CONTENT while the metadata (that a
-- sealed capsule exists, and when it opens) stays visible to both partners:
-- anticipation is the feature.

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

-- metadata: both partners always see that a capsule exists + when it opens
create policy "capsule members read" on public.capsules
  for select using (public.is_couple_member(couple_id));
create policy "capsule members insert" on public.capsules
  for insert with check (public.is_couple_member(couple_id) and author_id = (select auth.uid()));
-- only marking opened_at is a legitimate update; content rows are immutable
create policy "capsule members mark opened" on public.capsules
  for update using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- content: sealed until opens_at for EVERYONE — the author can't peek either;
-- that's what makes sealing it mean something
create policy "capsule content readable when open" on public.capsule_contents
  for select using (
    exists (
      select 1 from public.capsules c
      where c.id = capsule_id
        and public.is_couple_member(c.couple_id)
        and c.opens_at <= now()
    )
  );
create policy "capsule content insert" on public.capsule_contents
  for insert with check (
    exists (
      select 1 from public.capsules c
      where c.id = capsule_id
        and c.author_id = (select auth.uid())
        and public.is_couple_member(c.couple_id)
    )
  );

create index capsules_couple_opens_idx on public.capsules (couple_id, opens_at);
