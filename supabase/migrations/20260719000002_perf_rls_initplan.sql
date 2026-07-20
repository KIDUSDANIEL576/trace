-- Performance: initplan auth.uid() in write policies (advisor 0003) and cover
-- the canvases→couples FK (advisor 0001).

create index if not exists canvases_couple_idx on public.canvases(couple_id);

drop policy "authors write own strokes" on public.strokes;
create policy "authors write own strokes"
  on public.strokes for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_couple_member((select couple_id from public.canvases c where c.id = canvas_id))
  );

drop policy "members write own daily marks" on public.daily_marks;
create policy "members write own daily marks"
  on public.daily_marks for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy "users manage own push token" on public.push_tokens;
create policy "users manage own push token"
  on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
