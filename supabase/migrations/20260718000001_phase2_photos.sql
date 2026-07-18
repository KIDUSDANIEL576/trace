-- Phase 2: private photo bucket for photo canvases + couple-scoped RLS.
-- Object path convention: {couple_id}/{uuid}.jpg — the first path segment
-- drives the policies below via storage.foldername(name).
-- No table DDL: canvases.kind='photo' + photo_url shipped in the init migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "couple members read photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );

create policy "couple members upload photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );
