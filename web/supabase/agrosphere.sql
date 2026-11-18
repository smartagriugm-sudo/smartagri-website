-- agrosphere, stage 1: who may open which dashboard. Design and decisions:
-- docs/agrosphere/RENCANA-AGROSPHERE.md. Run manually in the Supabase SQL editor
-- after accounts.sql, the pf-*.sql files and edge-sync.sql. Safe to run again.
--
-- The rule, enforced here and not only in the pages:
--   - lab admins: every dashboard and every greenhouse site
--   - researchers (active, lab_role not 'mitra'): only what an admin gave them
--       Plant Factory  a role in pf_user_role (/erp/settings/roles)
--       Greenhouse     a site in edge_site_member (per site)
--       Indoor         a row in agro_app_member
--   - partners (lab_role 'mitra'): Greenhouse sites they were given, nothing else.
--     Never the Plant Factory, not even read only, and never Indoor, whose data
--     is still a simulation.
--   - pending, suspended or rejected accounts and visitors: nothing
--
-- Before this file every active account, partners included, could read the
-- Plant Factory's crops, recipes and batches, and every researcher could read
-- every greenhouse site. Running it takes that away until an admin grants it.
-- The pf-*.sql and edge-sync.sql sources carry the same rules, so running one of
-- them again does not reopen anything.

-- 1. Plant Factory: an ERP role opens it ------------------------------------------
-- Same definitions as pf-foundation.sql.
create or replace function public.pf_is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.status = 'active'
       and (p.is_admin
            or (coalesce(p.lab_role, '') <> 'mitra'
                and exists (select 1 from public.pf_user_role r where r.profile_id = p.id)))
  );
$$;

create or replace function public.pf_has_role(wanted text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_is_member()
     and exists (select 1 from public.pf_user_role where profile_id = auth.uid() and role = any (wanted));
$$;

create or replace function public.pf_user_role_partner_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.profile_id and lab_role = 'mitra') then
    raise exception 'A partner account cannot get a Plant Factory role.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists pf_user_role_partner_guard on public.pf_user_role;
create trigger pf_user_role_partner_guard before insert or update on public.pf_user_role
  for each row execute function public.pf_user_role_partner_guard();

-- Every Plant Factory policy, view and function that still lets any lab member in
-- (is_lab_member()) now asks pf_is_member() instead. Found in the catalog rather
-- than listed by hand, so nothing installed is missed.
do $$
declare
  r      record;
  q      text;
  c      text;
  def    text;
  pat    constant text := '(public\.)?is_lab_member\(\)';
  rep    constant text := 'public.pf_is_member()';
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where (schemaname = 'public' and tablename like 'pf\_%')
        or (schemaname = 'storage' and tablename = 'objects' and policyname like 'pf\_%')
  loop
    if r.schemaname = 'public' and r.tablename = 'pf_user_role' and r.policyname = 'pf_user_role_read' then
      -- Reading your own roles needs no membership (a partner simply has none).
      execute 'alter policy pf_user_role_read on public.pf_user_role using (profile_id = auth.uid() or public.pf_can_read_audit())';
      continue;
    end if;
    q := regexp_replace(r.qual, pat, rep, 'g');
    c := regexp_replace(r.with_check, pat, rep, 'g');
    if q is distinct from r.qual then
      execute format('alter policy %I on %I.%I using (%s)', r.policyname, r.schemaname, r.tablename, q);
    end if;
    if c is distinct from r.with_check then
      execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, c);
    end if;
  end loop;

  for r in
    select cl.oid, cl.relname
      from pg_class cl join pg_namespace n on n.oid = cl.relnamespace
     where n.nspname = 'public' and cl.relkind = 'v' and cl.relname like 'pf\_%'
       and pg_get_viewdef(cl.oid) ~ pat
  loop
    execute format('create or replace view public.%I as %s', r.relname,
                   regexp_replace(pg_get_viewdef(r.oid), pat, rep, 'g'));
  end loop;

  for r in
    select p.oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'pf\_%' and p.prokind = 'f'
       and p.prosrc ~ pat
  loop
    def := pg_get_functiondef(r.oid);
    execute regexp_replace(def, pat, rep, 'g');
  end loop;
end;
$$;

-- 2. Greenhouse: only the sites an admin gave you ----------------------------------
-- Same definition as edge-sync.sql.
create or replace function public.edge_readable_sites()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
    from public.edge_site s
   where exists (
           select 1 from public.profiles p
            where p.id = auth.uid() and p.status = 'active' and p.is_admin
         )
      or exists (
           select 1 from public.edge_site_member m
             join public.profiles p on p.id = m.user_id
            where m.site_id = s.id and m.user_id = auth.uid() and p.status = 'active'
         );
$$;

-- 3. Indoor, and later dashboards without a finer permission of their own ------------
create table if not exists public.agro_app_member (
  app      text not null check (app in ('indoor')),
  user_id  uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid default auth.uid(),
  primary key (app, user_id)
);
create index if not exists agro_app_member_user_idx on public.agro_app_member (user_id);

alter table public.agro_app_member enable row level security;
drop policy if exists "own access" on public.agro_app_member;
create policy "own access" on public.agro_app_member for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());
-- Written only through agro_admin_set_app().
revoke insert, update, delete, truncate on public.agro_app_member from public, anon, authenticated;

-- Indoor shows simulated data, so a partner is never given it.
create or replace function public.agro_app_member_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.app = 'indoor' and exists (select 1 from public.profiles where id = new.user_id and lab_role = 'mitra') then
    raise exception 'A partner account cannot get the Indoor dashboard.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists agro_app_member_guard on public.agro_app_member;
create trigger agro_app_member_guard before insert or update on public.agro_app_member
  for each row execute function public.agro_app_member_guard();

-- 4. One answer for the pages -------------------------------------------------------
-- Whether the signed-in account may open a dashboard.
create or replace function public.agro_can(app text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case app
    when 'plant-factory' then public.pf_is_member()
    when 'greenhouse' then exists (select 1 from public.edge_readable_sites())
    when 'indoor' then exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.status = 'active'
         and (p.is_admin
              or (coalesce(p.lab_role, '') <> 'mitra'
                  and exists (select 1 from public.agro_app_member m where m.app = 'indoor' and m.user_id = p.id)))
    )
    else false
  end;
$$;

-- What the agrosphere launcher shows: one row per dashboard the account may open,
-- and for the greenhouse one row per site.
create or replace function public.agro_my_apps()
returns table (app text, site_id uuid, site_code text, site_name text)
language sql
stable
security definer
set search_path = public
as $$
  select 'plant-factory'::text, null::uuid, null::text, null::text where public.agro_can('plant-factory')
  union all
  select 'greenhouse'::text, s.id, s.code, s.name
    from public.edge_site s
   where s.id in (select public.edge_readable_sites())
  union all
  select 'indoor'::text, null::uuid, null::text, null::text where public.agro_can('indoor');
$$;

-- 5. Admin -------------------------------------------------------------------------
-- Every account with what it may open, for the access page.
create or replace function public.agro_admin_access()
returns table (user_id uuid, email text, full_name text, lab_role text, status text, is_admin boolean,
               pf_roles text[], greenhouse_sites uuid[], indoor boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage dashboard access.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text,
           coalesce(nullif(p.full_name, ''), p.preferred_name, ''),
           coalesce(p.lab_role, ''), coalesce(p.status, ''), coalesce(p.is_admin, false),
           coalesce((select array_agg(r.role order by r.role) from public.pf_user_role r where r.profile_id = u.id), '{}'),
           coalesce((select array_agg(m.site_id) from public.edge_site_member m where m.user_id = u.id), '{}'),
           exists (select 1 from public.agro_app_member a where a.app = 'indoor' and a.user_id = u.id)
      from auth.users u
      left join public.profiles p on p.id = u.id
     order by coalesce(nullif(p.full_name, ''), u.email);
end;
$$;

-- Gives or takes a dashboard that has no finer permission (today: Indoor). The
-- Plant Factory goes through ERP roles, the greenhouse through edge_admin_add_member.
create or replace function public.agro_admin_set_app(target_app text, member uuid, allowed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage dashboard access.' using errcode = '42501';
  end if;
  if target_app <> 'indoor' then
    raise exception 'Unknown dashboard: %', target_app;
  end if;
  if allowed then
    insert into public.agro_app_member (app, user_id, added_by)
    values (target_app, member, auth.uid())
    on conflict (app, user_id) do nothing;
  else
    delete from public.agro_app_member where app = target_app and user_id = member;
  end if;
end;
$$;

-- 6. Grants --------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'agro_can(text)',
    'agro_my_apps()',
    'agro_admin_access()',
    'agro_admin_set_app(text, uuid, boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
