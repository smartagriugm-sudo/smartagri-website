-- Dummy bookings, so the Bookings screens can be seen filled. NOT real data.
-- Run manually in the Supabase SQL editor after pf-booking.sql and pf-demo-seed.sql
-- (it uses the dummy people). Removed by pf-demo-clean.sql. Dates are relative to the
-- day it is run. It stops without changing anything if it has already run.

begin;

create or replace function pg_temp.d(domain integer, n bigint) returns uuid language sql immutable as $$
  select ('d0000000-0000-4000-8000-' || lpad(domain::text, 4, '0') || lpad(n::text, 8, '0'))::uuid
$$;

do $$
declare
  today date := (now() at time zone 'Asia/Jakarta')::date;
  later date;
begin
  if exists (select 1 from public.pf_booking where id = pg_temp.d(40, 1)) then
    raise exception 'The dummy bookings are already there. Run pf-demo-clean.sql first to fill them again.';
  end if;
  if not exists (select 1 from public.pf_person where id = pg_temp.d(20, 1)) then
    raise exception 'Run pf-demo-seed.sql first: the dummy bookings use its dummy people.';
  end if;
  -- Sunday is a day off, so the poll does not offer one.
  later := today + 8 + (extract(isodow from today + 8) = 7)::integer;

  insert into public.pf_booking (id, title, kind, space, place_note, host_id, guest_org, guest_count, contact_name, contact_phone, contact_email, video_link, description, allow_maybe, status, cancel_note) values
    (pg_temp.d(40, 1), 'School visit (dummy)', 'kunjungan', 'plant_factory', 'Meet at the lobby, shoe covers at the door', pg_temp.d(20, 1), 'SMA Negeri 1 Dummy', 35, 'Bu Ratna (dummy)', '0812-0000-4001', 'ratna@contoh.test', '', 'A tour of the plant factory and a short talk on hydroponics. Groups of ten inside the growing room.', true, 'mencari', ''),
    (pg_temp.d(40, 2), 'Hydroponics training for a farmers'' group (dummy)', 'pelatihan', 'lab', '', pg_temp.d(20, 3), 'Kelompok Tani Dummy', 20, 'Pak Joko (dummy)', '0812-0000-4002', '', '', 'Nutrient mixing, EC and pH checks, and transplanting. Bring notebooks.', true, 'mencari', ''),
    (pg_temp.d(40, 3), 'Lettuce light trial: sampling (dummy)', 'penelitian', 'growth_chamber', '', pg_temp.d(20, 4), '', null, '', '', '', '', 'Leaf samples from shelves 1 and 2 for chlorophyll.', true, 'mencari', ''),
    (pg_temp.d(40, 4), 'Partner meeting with PT Agro Dummy', 'rapat', 'ruang_rapat', '', pg_temp.d(20, 1), 'PT Agro Dummy', 3, 'Mr Hadi (dummy)', '', 'hadi@contoh.test', 'https://meet.google.com/dmy-dmmy-dmy', 'Supply plan for next quarter.', true, 'mencari', ''),
    (pg_temp.d(40, 5), 'Campus tour for new students (dummy)', 'kunjungan', 'plant_factory', '', pg_temp.d(20, 3), 'Faculty of Agriculture', 25, '', '', '', '', '', true, 'mencari', ''),
    (pg_temp.d(40, 6), 'Visit from the agriculture office (dummy)', 'kunjungan', 'plant_factory', '', pg_temp.d(20, 1), 'Dinas Pertanian Dummy', 6, '', '', '', '', '', true, 'mencari', ''),
    (pg_temp.d(40, 7), 'Drone mapping workshop (dummy)', 'pelatihan', 'lapangan', '', pg_temp.d(20, 3), '', 15, '', '', '', '', '', false, 'mencari', '');

  insert into public.pf_booking_option (id, booking_id, day, start_at, end_at) values
    (pg_temp.d(41, 1), pg_temp.d(40, 1), today + 2, '09:00', '11:00'),
    (pg_temp.d(41, 2), pg_temp.d(40, 2), today + 5, '08:00', '12:00'),
    (pg_temp.d(41, 3), pg_temp.d(40, 3), today, '13:00', '15:00'),
    (pg_temp.d(41, 4), pg_temp.d(40, 4), today + 3, '10:00', '11:00'),
    (pg_temp.d(41, 5), pg_temp.d(40, 4), today + 3, '13:00', '14:00'),
    (pg_temp.d(41, 6), pg_temp.d(40, 4), today + 4, '10:00', '11:00'),
    (pg_temp.d(41, 7), pg_temp.d(40, 5), today + 2, '10:00', '11:00'),
    (pg_temp.d(41, 8), pg_temp.d(40, 5), later, '09:00', '10:00'),
    (pg_temp.d(41, 9), pg_temp.d(40, 5), later, '13:00', '14:00'),
    (pg_temp.d(41, 10), pg_temp.d(40, 6), today - 6, '09:00', '11:00'),
    (pg_temp.d(41, 11), pg_temp.d(40, 7), today + 9, null, null);

  update public.pf_booking set status = 'terjadwal', chosen_option = pg_temp.d(41, 1) where id = pg_temp.d(40, 1);
  update public.pf_booking set status = 'terjadwal', chosen_option = pg_temp.d(41, 2) where id = pg_temp.d(40, 2);
  update public.pf_booking set status = 'terjadwal', chosen_option = pg_temp.d(41, 3) where id = pg_temp.d(40, 3);
  update public.pf_booking set status = 'terjadwal', chosen_option = pg_temp.d(41, 10) where id = pg_temp.d(40, 6);
  update public.pf_booking set status = 'batal', cancel_note = 'Rain forecast all week' where id = pg_temp.d(40, 7);

  insert into public.pf_booking_invitee (booking_id, person_id) values
    (pg_temp.d(40, 1), pg_temp.d(20, 2)),
    (pg_temp.d(40, 4), pg_temp.d(20, 1)), (pg_temp.d(40, 4), pg_temp.d(20, 2)), (pg_temp.d(40, 4), pg_temp.d(20, 3)),
    (pg_temp.d(40, 5), pg_temp.d(20, 1)), (pg_temp.d(40, 5), pg_temp.d(20, 4)), (pg_temp.d(40, 5), pg_temp.d(20, 6));

  insert into public.pf_booking_vote (option_id, person_id, answer) values
    (pg_temp.d(41, 4), pg_temp.d(20, 1), 'ya'), (pg_temp.d(41, 5), pg_temp.d(20, 1), 'ya'), (pg_temp.d(41, 6), pg_temp.d(20, 1), 'tidak'),
    (pg_temp.d(41, 4), pg_temp.d(20, 2), 'mungkin'), (pg_temp.d(41, 5), pg_temp.d(20, 2), 'ya'), (pg_temp.d(41, 6), pg_temp.d(20, 2), 'ya'),
    (pg_temp.d(41, 4), pg_temp.d(20, 3), 'tidak'), (pg_temp.d(41, 5), pg_temp.d(20, 3), 'ya'), (pg_temp.d(41, 6), pg_temp.d(20, 3), 'mungkin'),
    (pg_temp.d(41, 7), pg_temp.d(20, 4), 'ya'), (pg_temp.d(41, 8), pg_temp.d(20, 4), 'ya'), (pg_temp.d(41, 9), pg_temp.d(20, 4), 'tidak'),
    (pg_temp.d(41, 7), pg_temp.d(20, 6), 'tidak'), (pg_temp.d(41, 8), pg_temp.d(20, 6), 'mungkin'), (pg_temp.d(41, 9), pg_temp.d(20, 6), 'ya');
end;
$$;

commit;
