-- Phase 3: private bucket for widget canvas snapshots.
-- Written only by the render-snapshot edge function (service role);
-- couple members read via signed URLs. Path: {couple_id}/snapshot.png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('widgets', 'widgets', false, 5242880, array['image/png'])
on conflict (id) do nothing;

create policy "couple members read widget snapshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'widgets'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );
