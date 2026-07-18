-- Trace Phase 1 schema — couples, canvases, append-only strokes, streaks, push.
-- Apply with: supabase db push  (or paste into the SQL editor)

create extension if not exists pgcrypto;

-- ---------- tables ----------

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table public.members (
  couple_id uuid references public.couples(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  primary key (couple_id, user_id)
);
-- one couple per user in Phase 1
create unique index members_one_couple_per_user on public.members(user_id);

create table public.canvases (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  kind text check (kind in ('shared','photo')) default 'shared',
  photo_url text,
  created_at timestamptz default now()
);

-- append-only history: this IS Relationship Replay
create table public.strokes (
  id bigint generated always as identity primary key,
  canvas_id uuid references public.canvases(id) on delete cascade not null,
  author_id uuid not null,
  brush text not null check (brush in ('marker','glow','neon','chalk')),
  color text not null,
  width real not null,
  points jsonb not null, -- [[x,y],...] normalized 0..1
  created_at timestamptz default now()
);
create index strokes_canvas_idx on public.strokes(canvas_id, id);

create table public.daily_marks (
  couple_id uuid references public.couples(id) on delete cascade,
  day date not null,
  user_id uuid not null,
  primary key (couple_id, day, user_id)
);

create table public.push_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null,
  updated_at timestamptz default now()
);

-- service-role only; the notify-partner edge function throttles with this
create table public.push_log (
  id bigint generated always as identity primary key,
  couple_id uuid references public.couples(id) on delete cascade not null,
  recipient_id uuid not null,
  sent_at timestamptz default now()
);
create index push_log_recent_idx on public.push_log(couple_id, recipient_id, sent_at desc);

-- ---------- RLS ----------

alter table public.couples enable row level security;
alter table public.members enable row level security;
alter table public.canvases enable row level security;
alter table public.strokes enable row level security;
alter table public.daily_marks enable row level security;
alter table public.push_tokens enable row level security;
alter table public.push_log enable row level security; -- no policies: service role only

-- security definer so members policies don't recurse
create or replace function public.is_couple_member(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members where couple_id = cid and user_id = auth.uid()
  );
$$;

create policy "members read their couple"
  on public.couples for select to authenticated
  using (public.is_couple_member(id));

create policy "members read their membership rows"
  on public.members for select to authenticated
  using (public.is_couple_member(couple_id));

create policy "members read canvases"
  on public.canvases for select to authenticated
  using (public.is_couple_member(couple_id));

create policy "members create canvases"
  on public.canvases for insert to authenticated
  with check (public.is_couple_member(couple_id));

create policy "members read strokes"
  on public.strokes for select to authenticated
  using (public.is_couple_member((select couple_id from public.canvases c where c.id = canvas_id)));

create policy "authors write own strokes"
  on public.strokes for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_couple_member((select couple_id from public.canvases c where c.id = canvas_id))
  );

-- undo-own-stroke and clear-canvas
create policy "members delete strokes"
  on public.strokes for delete to authenticated
  using (public.is_couple_member((select couple_id from public.canvases c where c.id = canvas_id)));

create policy "members read daily marks"
  on public.daily_marks for select to authenticated
  using (public.is_couple_member(couple_id));

create policy "members write own daily marks"
  on public.daily_marks for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));

create policy "users manage own push token"
  on public.push_tokens for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- realtime authorization (private broadcast channels) ----------
-- Channel per couple: `couple:{couple_id}` — only members can send/receive.

create policy "couple members receive broadcasts"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() like 'couple:%'
    and public.is_couple_member((split_part(realtime.topic(), ':', 2))::uuid)
  );

create policy "couple members send broadcasts"
  on realtime.messages for insert to authenticated
  with check (
    realtime.topic() like 'couple:%'
    and public.is_couple_member((split_part(realtime.topic(), ':', 2))::uuid)
  );

-- ---------- RPCs (security definer keeps pairing simple under RLS) ----------

create or replace function public.generate_invite_code()
returns text
language sql volatile
set search_path = public
as $$
  -- 6 chars, no ambiguous I/L/O/0/1
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), ''
  )
  from generate_series(1, 6);
$$;

create or replace function public.create_couple(p_display_name text)
returns table (couple_id uuid, invite_code text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_code text;
  v_couple uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'You are already in a couple';
  end if;

  loop
    v_code := generate_invite_code();
    begin
      insert into couples (invite_code) values (v_code) returning id into v_couple;
      exit;
    exception when unique_violation then
      -- rare collision: try another code
    end;
  end loop;

  insert into members (couple_id, user_id, display_name)
  values (v_couple, auth.uid(), nullif(trim(p_display_name), ''));

  insert into canvases (couple_id, kind) values (v_couple, 'shared');

  return query select v_couple, v_code;
end;
$$;

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

  select id into v_couple from couples where invite_code = upper(trim(p_code));
  if v_couple is null then
    raise exception 'That code does not exist';
  end if;

  select count(*) into v_count from members where couple_id = v_couple;
  if v_count >= 2 then
    raise exception 'This couple is already complete';
  end if;

  insert into members (couple_id, user_id, display_name)
  values (v_couple, auth.uid(), nullif(trim(p_display_name), ''));

  return v_couple;
end;
$$;

grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text, text) to authenticated;
revoke execute on function public.create_couple(text) from anon;
revoke execute on function public.join_couple(text, text) from anon;
revoke execute on function public.generate_invite_code() from anon, authenticated;
