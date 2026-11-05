-- Private bucket for the ERP's 3D model. Run manually in the Supabase SQL editor,
-- after accounts.sql (it uses public.is_lab_member()). Then upload the files as
-- described in SETUP-ERP-MODEL.md.
--
-- Only approved lab members can read, through short-lived signed links. There is
-- deliberately no write policy: files are uploaded from the Supabase dashboard.

insert into storage.buckets (id, name, public)
values ('pf-model', 'pf-model', false)
on conflict (id) do update set public = false;

drop policy if exists "pf_model_read_lab_members" on storage.objects;
create policy "pf_model_read_lab_members"
  on storage.objects for select to authenticated
  using (bucket_id = 'pf-model' and public.is_lab_member());
