-- ERP bookings: research sessions, visits, trainings and meetings at the facility.
-- Run manually in the Supabase SQL editor after pf-hr.sql. Safe to run again.
--
-- A booking starts with one or more time options. With one option it is booked at
-- once. With more, the people invited answer each option (yes, if need be, no) and
-- the organiser confirms the time that suits most, as a scheduling poll would.
--
-- Who may do what: every lab member sees bookings and may propose one. The person
-- who made a booking, and those who keep the team's schedule, may change, confirm
-- or cancel it. Each person answers only for themselves.

-- 1. Tables --------------------------------------------------------------------

create table if not exists public.pf_booking (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (length(trim(title)) > 0),
  kind            text not null default 'kunjungan' check (kind in ('penelitian', 'kunjungan', 'pelatihan', 'rapat', 'lainnya')),
  space           text not null default 'ruang_rapat' check (space in ('plant_factory', 'growth_chamber', 'lab', 'ruang_rapat', 'lapangan', 'daring')),
  place_note      text not null default '',
  host_id         uuid references public.pf_person (id) on delete set null,
  guest_org       text not null default '',
  guest_count     integer check (guest_count is null or guest_count between 1 and 500),
  contact_name    text not null default '',
  contact_phone   text not null default '',
  contact_email   text not null default '',
  video_link      text not null default '',
  description     text not null default '',
  allow_maybe     boolean not null default true,
  status          text not null default 'mencari' check (status in ('mencari', 'terjadwal', 'batal')),
  chosen_option   uuid,
  cancel_note     text not null default '',
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists pf_booking_status_idx on public.pf_booking (status);

-- One possible time. No start and end means the whole day.
create table if not exists public.pf_booking_option (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.pf_booking (id) on delete cascade,
  day        date not null,
  start_at   time,
  end_at     time,
  check ((start_at is null and end_at is null) or (start_at is not null and end_at is not null and end_at > start_at))
);
create unique index if not exists pf_booking_option_once on public.pf_booking_option (booking_id, day, coalesce(start_at, '00:00'), coalesce(end_at, '00:00'));
create index if not exists pf_booking_option_day_idx on public.pf_booking_option (day);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pf_booking_chosen_fk') then
    alter table public.pf_booking add constraint pf_booking_chosen_fk
      foreign key (chosen_option) references public.pf_booking_option (id) on delete set null;
  end if;
end;
$$;

create table if not exists public.pf_booking_invitee (
  booking_id uuid not null references public.pf_booking (id) on delete cascade,
  person_id  uuid not null references public.pf_person (id) on delete cascade,
  primary key (booking_id, person_id)
);

create table if not exists public.pf_booking_vote (
  option_id  uuid not null references public.pf_booking_option (id) on delete cascade,
  person_id  uuid not null references public.pf_person (id) on delete cascade,
  answer     text not null check (answer in ('ya', 'mungkin', 'tidak')),
  updated_at timestamptz not null default now(),
  primary key (option_id, person_id)
);

-- 2. Row level security ---------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['pf_booking', 'pf_booking_option', 'pf_booking_invitee', 'pf_booking_vote'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_lab_member())', t || '_read', t);
  end loop;
end;
$$;

-- 3. Views ----------------------------------------------------------------------
-- They run with their owner's rights, so every lab member sees the names of the host,
-- the people invited and who answered what, which pf_person alone shows only to
-- coordinators. Each view checks membership itself.

create or replace view public.pf_booking_overview with (security_invoker = false) as
select
  b.id, b.title, b.kind, b.space, b.place_note, b.host_id, b.guest_org, b.guest_count,
  b.contact_name, b.contact_phone, b.contact_email, b.video_link, b.description,
  b.allow_maybe, b.status, b.chosen_option, b.cancel_note, b.created_by, b.created_at,
  h.full_name as host_name,
  o.day as chosen_day, o.start_at as chosen_start, o.end_at as chosen_end,
  (select count(*) from public.pf_booking_option x where x.booking_id = b.id)::integer as option_count,
  (select count(distinct v.person_id) from public.pf_booking_vote v join public.pf_booking_option x on x.id = v.option_id where x.booking_id = b.id)::integer as voter_count,
  (select min(x.day) from public.pf_booking_option x where x.booking_id = b.id) as first_day,
  (select max(x.day) from public.pf_booking_option x where x.booking_id = b.id) as last_day
from public.pf_booking b
left join public.pf_person h on h.id = b.host_id
left join public.pf_booking_option o on o.id = b.chosen_option
where public.is_lab_member();

create or replace view public.pf_booking_vote_overview with (security_invoker = false) as
select v.option_id, v.person_id, v.answer, v.updated_at, o.booking_id, p.full_name
from public.pf_booking_vote v
join public.pf_booking_option o on o.id = v.option_id
join public.pf_person p on p.id = v.person_id
where public.is_lab_member();

create or replace view public.pf_booking_invitee_overview with (security_invoker = false) as
select i.booking_id, i.person_id, p.full_name
from public.pf_booking_invitee i
join public.pf_person p on p.id = i.person_id
where public.is_lab_member();

revoke all on public.pf_booking_overview, public.pf_booking_vote_overview, public.pf_booking_invitee_overview from anon;
grant select on public.pf_booking_overview, public.pf_booking_vote_overview, public.pf_booking_invitee_overview to authenticated;

-- 4. Writes ---------------------------------------------------------------------

create or replace function public.pf_booking_can_edit(booking uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.pf_can_schedule()
      or exists (select 1 from public.pf_booking b where b.id = booking and b.created_by = auth.uid());
$$;

-- Creates (target null) or changes a booking. Options left out are removed with their
-- answers; options kept keep theirs. `options` is a JSON array of {day, start, end},
-- start and end null for a whole day. With book_now and one option, it is booked at once.
create or replace function public.pf_booking_save(
  target uuid, new_title text, new_kind text, new_space text, new_place text, host uuid,
  org text, guests integer, contact text, phone text, email text, link text, about text,
  maybe boolean, options jsonb, invitees uuid[], book_now boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  booking uuid := target;
  wanted  integer := coalesce(jsonb_array_length(options), 0);
  only_one uuid;
begin
  perform public.pf_require(public.is_lab_member());
  if wanted = 0 then
    raise exception 'Choose at least one time';
  end if;
  if wanted > 60 then
    raise exception 'A booking can offer at most 60 times';
  end if;
  if exists (
    select 1 from jsonb_array_elements(options) e
     where (e ->> 'start') is distinct from null and ((e ->> 'end') is null or (e ->> 'end')::time <= (e ->> 'start')::time)
  ) then
    raise exception 'Each time must end after it starts';
  end if;

  if booking is null then
    insert into public.pf_booking (title, kind, space, place_note, host_id, guest_org, guest_count, contact_name, contact_phone, contact_email, video_link, description, allow_maybe)
    values (trim(new_title), new_kind, new_space, trim(coalesce(new_place, '')), host, trim(coalesce(org, '')), guests, trim(coalesce(contact, '')), trim(coalesce(phone, '')), trim(coalesce(email, '')), trim(coalesce(link, '')), trim(coalesce(about, '')), coalesce(maybe, true))
    returning id into booking;
  else
    perform public.pf_require(public.pf_booking_can_edit(booking));
    update public.pf_booking set
      title = trim(new_title), kind = new_kind, space = new_space, place_note = trim(coalesce(new_place, '')), host_id = host,
      guest_org = trim(coalesce(org, '')), guest_count = guests, contact_name = trim(coalesce(contact, '')),
      contact_phone = trim(coalesce(phone, '')), contact_email = trim(coalesce(email, '')), video_link = trim(coalesce(link, '')),
      description = trim(coalesce(about, '')), allow_maybe = coalesce(maybe, true)
    where id = booking and status <> 'batal';
    if not found then
      raise exception 'Booking not found or cancelled';
    end if;
    delete from public.pf_booking_option o
     where o.booking_id = booking
       and not exists (
         select 1 from jsonb_array_elements(options) e
          where (e ->> 'day')::date = o.day
            and (e ->> 'start')::time is not distinct from o.start_at
            and (e ->> 'end')::time is not distinct from o.end_at
       );
  end if;

  insert into public.pf_booking_option (booking_id, day, start_at, end_at)
  select distinct booking, (e ->> 'day')::date, (e ->> 'start')::time, (e ->> 'end')::time
    from jsonb_array_elements(options) e
   where not exists (
     select 1 from public.pf_booking_option o
      where o.booking_id = booking and o.day = (e ->> 'day')::date
        and o.start_at is not distinct from (e ->> 'start')::time
        and o.end_at is not distinct from (e ->> 'end')::time
   );

  delete from public.pf_booking_invitee i where i.booking_id = booking and not (i.person_id = any (coalesce(invitees, '{}')));
  insert into public.pf_booking_invitee (booking_id, person_id)
  select booking, p from unnest(coalesce(invitees, '{}')) p
  on conflict do nothing;

  -- One time left: it is the booking's time. More: the poll is open again unless the chosen one is still there.
  if book_now and wanted = 1 then
    select id into only_one from public.pf_booking_option where booking_id = booking;
    update public.pf_booking set status = 'terjadwal', chosen_option = only_one where id = booking;
  elsif not exists (select 1 from public.pf_booking b join public.pf_booking_option o on o.id = b.chosen_option where b.id = booking) then
    update public.pf_booking set status = 'mencari', chosen_option = null where id = booking and status = 'terjadwal';
  end if;
  return booking;
end;
$$;

-- The caller's own answers. Answering also puts them on the list of people invited.
create or replace function public.pf_booking_vote(booking uuid, answers jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := public.pf_my_person_id();
begin
  perform public.pf_require(public.is_lab_member());
  if me is null then
    raise exception 'Your account is not linked to a person on the People page yet';
  end if;
  if not exists (select 1 from public.pf_booking b where b.id = booking and b.status = 'mencari') then
    raise exception 'This booking is no longer asking for answers';
  end if;
  if exists (select 1 from public.pf_booking b where b.id = booking and not b.allow_maybe)
     and exists (select 1 from jsonb_each_text(answers) a where a.value = 'mungkin') then
    raise exception 'This booking takes only yes or no';
  end if;
  insert into public.pf_booking_invitee (booking_id, person_id) values (booking, me) on conflict do nothing;
  delete from public.pf_booking_vote v
   using public.pf_booking_option o
   where o.id = v.option_id and o.booking_id = booking and v.person_id = me;
  insert into public.pf_booking_vote (option_id, person_id, answer)
  select o.id, me, a.value
    from jsonb_each_text(answers) a
    join public.pf_booking_option o on o.id = a.key::uuid and o.booking_id = booking
   where a.value in ('ya', 'mungkin', 'tidak');
end;
$$;

create or replace function public.pf_booking_confirm(booking uuid, chosen uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_booking_can_edit(booking));
  if not exists (select 1 from public.pf_booking_option o where o.id = chosen and o.booking_id = booking) then
    raise exception 'That time is not one of this booking''s options';
  end if;
  update public.pf_booking set status = 'terjadwal', chosen_option = chosen, cancel_note = ''
   where id = booking and status <> 'batal';
  if not found then
    raise exception 'Booking not found or cancelled';
  end if;
end;
$$;

-- Back to asking: the confirmed time stays one of the options.
create or replace function public.pf_booking_reopen(booking uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_booking_can_edit(booking));
  update public.pf_booking set status = 'mencari', chosen_option = null, cancel_note = '' where id = booking;
  if not found then
    raise exception 'Booking not found';
  end if;
end;
$$;

create or replace function public.pf_booking_cancel(booking uuid, why text default '')
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_booking_can_edit(booking));
  update public.pf_booking set status = 'batal', cancel_note = trim(coalesce(why, '')) where id = booking and status <> 'batal';
  if not found then
    raise exception 'Booking not found or already cancelled';
  end if;
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_booking_can_edit(uuid)',
    'pf_booking_save(uuid, text, text, text, text, uuid, text, integer, text, text, text, text, text, boolean, jsonb, uuid[], boolean)',
    'pf_booking_vote(uuid, jsonb)',
    'pf_booking_confirm(uuid, uuid)',
    'pf_booking_reopen(uuid)',
    'pf_booking_cancel(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- 5. Audit ----------------------------------------------------------------------

do $$
declare
  audited text;
begin
  foreach audited in array array['pf_booking', 'pf_booking_option'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;
