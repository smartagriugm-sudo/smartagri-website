-- PUAPT logbook: usage history import for the WGFS rate-card instruments.
-- Run once in the Supabase SQL editor. Idempotent (deterministic ids).

insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8b104f5e-1d2f-5aee-8c15-94688b659534', i.id, 'Saifuddin Afif', 'internal', 'self', '2025-04-13 00:00:00+07', '2025-04-13 00:00:00+07', 'returned', 'Masih bagus, masih bisa auto kaliberasi dan akuisisi data', 'Masih bagus, masih bisa auto kaliberasi dan akuisisi data', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-04-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2a7e6617-036a-50fa-a768-3c54e2325dee', i.id, 'Mumtaz Hatta N S', 'internal', 'self', '2025-04-26 00:00:00+07', '2025-04-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-04-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '050c7f7c-03b5-54db-bf83-626cbeb5dda6', i.id, 'Kevin Ezekiel Manik', 'internal', 'self', '2025-05-09 00:00:00+07', '2025-05-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-05-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4ec66745-e657-5781-9b35-d8f5c69d7b69', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2025-06-21 00:00:00+07', '2025-06-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-06-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'beacdb72-b800-55b6-9bf1-e9ef2228c4ac', i.id, 'Athala Fawwaz', 'internal', 'self', '2025-07-03 00:00:00+07', '2025-07-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-07-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'eb51d1fd-1d0b-5ab1-b183-34e3338f0522', i.id, 'Fadel Arya', 'internal', 'self', '2025-07-15 00:00:00+07', '2025-07-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-07-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '980582e9-7b06-5309-a56a-c6eb8d9c68d0', i.id, 'Hanif Nur Wahid', 'internal', 'self', '2025-07-28 00:00:00+07', '2025-07-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-07-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c883f1e5-d21e-53a7-b601-87c6ad4e7cfd', i.id, 'Muhammad Ammar M.', 'internal', 'self', '2025-08-06 00:00:00+07', '2025-08-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-08-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6f7c28bf-c3cf-50b8-8ee9-4f7fa4ec8e01', i.id, 'Adiasa Rangga F', 'internal', 'self', '2025-08-18 00:00:00+07', '2025-08-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-08-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '1394c1b2-8db7-5c8d-b071-33447fa88598', i.id, 'Muh. Ilham Kholid', 'internal', 'self', '2025-09-02 00:00:00+07', '2025-09-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-09-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fc2f826c-8bca-5fc6-8bfe-3d59e6cee502', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2025-09-17 00:00:00+07', '2025-09-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-09-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '56419461-3eab-5724-a0e8-aec004fe19e6', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2025-09-30 00:00:00+07', '2025-09-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-09-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '14eedf5b-68ff-5c3b-8d62-161538ad2c91', i.id, 'Fransiskus A. A. N. Christian', 'internal', 'self', '2025-10-14 00:00:00+07', '2025-10-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-10-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e8eecce7-3c4e-55d3-8bce-288c823abf9a', i.id, 'Rio Hatta Prayogi', 'internal', 'self', '2025-10-27 00:00:00+07', '2025-10-27 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-10-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '12670605-f428-50d9-b6dd-189ee5affc18', i.id, 'Ulfa Dwi Oktasari', 'internal', 'self', '2025-11-05 00:00:00+07', '2025-11-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-11-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '7ccc8908-2bf6-57f7-8551-5a654ec63a45', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2025-11-18 00:00:00+07', '2025-11-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-11-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a8147208-3c69-55ff-a54c-d0c8c6ff02b5', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2025-12-02 00:00:00+07', '2025-12-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-12-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fa7d1e63-bf68-5e28-bc96-1d1b99bc47cd', i.id, 'Syukur Rahmatullah', 'internal', 'self', '2025-12-15 00:00:00+07', '2025-12-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2025-12-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e5d36beb-167f-5b48-a8fb-3510db6abf86', i.id, 'Samuel Gatot Marseno', 'internal', 'self', '2026-01-06 00:00:00+07', '2026-01-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-01-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '81a360e5-2536-54b7-8dd7-fb820474c15d', i.id, 'Arif Rakhman Charis', 'internal', 'self', '2026-01-14 00:00:00+07', '2026-01-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-01-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '7a3fd156-2793-58d7-9215-ca012a18e065', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-01-22 00:00:00+07', '2026-01-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-01-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '002dd7d6-adea-5abc-8cbe-1b87b68f7e24', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-03 00:00:00+07', '2026-02-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0fcce961-d050-5716-9808-d585306de535', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-07 00:00:00+07', '2026-02-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '250b86b1-af47-5b08-826c-9b246bfaa70c', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-12 00:00:00+07', '2026-02-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '99dc14bb-10eb-5635-8085-31865a4e6094', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-17 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '10568c72-539a-5efc-a4e7-44c0b8c93aba', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-21 00:00:00+07', '2026-02-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '7f2ca391-7124-512b-ac38-26b848f7276f', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-25 00:00:00+07', '2026-02-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '07e7e98f-7ef7-5758-9344-af20f34b603e', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-28 00:00:00+07', '2026-02-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-02-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f1d425b0-d8be-5e31-86e5-bef3dfdcb714', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-03-03 00:00:00+07', '2026-03-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-03-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b28ead64-b23b-517f-9262-a9f0ea14a608', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-03-07 00:00:00+07', '2026-03-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-001)', '2026-03-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'de3577ea-b1b2-58ec-9c88-16e9fbd863ad', i.id, 'Shidqon Fathul Muqorrobin', 'internal', 'self', '2025-04-25 00:00:00+07', '2025-04-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-04-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3fa34468-4ce3-5e00-a3a4-e9c182131ded', i.id, 'Bagus Dwi Putra Atmaja', 'internal', 'self', '2025-05-06 00:00:00+07', '2025-05-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-05-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e6c3e66c-67b7-559e-b19f-ef69a34b7b68', i.id, 'M. Fajar Ridho Ilham', 'internal', 'self', '2025-05-20 00:00:00+07', '2025-05-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-05-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b0bc4054-36e4-5373-9124-cc935dc125cf', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-06-03 00:00:00+07', '2025-06-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-06-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '42908de2-f69e-5951-9aba-4433f1136576', i.id, 'Les’ Aullian Achmad Argito', 'internal', 'self', '2025-06-18 00:00:00+07', '2025-06-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-06-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a715d89c-4e57-5ef0-b2f7-30807954ba28', i.id, 'Arinda Fadea Pramaesela', 'internal', 'self', '2025-07-02 00:00:00+07', '2025-07-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-07-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'aaab5f6f-e408-5b15-82a4-837d24ae2eeb', i.id, 'Fajrian Anggit', 'internal', 'self', '2025-07-16 00:00:00+07', '2025-07-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-07-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '9b95caa0-87d3-509e-a286-9d6b39746d56', i.id, 'Zakha Wardana Saputra', 'internal', 'self', '2025-07-30 00:00:00+07', '2025-07-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-07-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3e18ce25-767f-55c1-8ca9-0de7316c2a76', i.id, 'Devi Ramdani', 'internal', 'self', '2025-08-12 00:00:00+07', '2025-08-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-08-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f462036d-6163-5621-9e78-2cb00da3a398', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-08-27 00:00:00+07', '2025-08-27 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-08-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8704981a-3177-5ce6-b308-526e6083bf99', i.id, 'Rizqi Asy’ari Ramadhan', 'internal', 'self', '2025-09-10 00:00:00+07', '2025-09-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-09-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a0b5aa5d-ed7b-532f-b548-d6214cdac575', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-09-25 00:00:00+07', '2025-09-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-09-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '153cfbc9-6e4a-5783-97b1-c2056f0eb359', i.id, 'Briliyan Hartanti', 'internal', 'self', '2025-10-09 00:00:00+07', '2025-10-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-10-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5297c046-8b6a-5e64-965f-b650086e8907', i.id, 'Ardan Desta Vaunendra', 'internal', 'self', '2025-10-28 00:00:00+07', '2025-10-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-10-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '15b92770-3a38-5819-b40e-f22b9680c17a', i.id, 'Mutiara Alifia R', 'internal', 'self', '2025-11-13 00:00:00+07', '2025-11-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-11-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'eb6683aa-75cd-5ab3-a765-99ea3cea0249', i.id, 'Diena Ita’ul Mufida', 'internal', 'self', '2025-12-02 00:00:00+07', '2025-12-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2025-12-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cf550af2-2285-57ed-bbe6-538c916d8a2e', i.id, 'Fadel Arya Pradana', 'internal', 'self', '2026-01-15 00:00:00+07', '2026-01-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2026-01-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ba562922-0ca3-5fdc-8e74-482873af648a', i.id, 'Fadel Arya Pradana', 'internal', 'self', '2026-01-29 00:00:00+07', '2026-01-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2026-01-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ade8b2d7-cab6-518b-a3f4-72eab4dc618f', i.id, 'Fadel Arya Pradana', 'internal', 'self', '2026-02-12 00:00:00+07', '2026-02-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2026-02-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f53cb2f3-ca0a-50f7-81cb-6b95a2ffae5c', i.id, 'Fadel Arya Pradana', 'internal', 'self', '2026-02-26 00:00:00+07', '2026-02-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2026-02-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3df4b929-e537-598b-acba-e2f0254995f0', i.id, 'Fadel Arya Pradana', 'internal', 'self', '2026-03-05 00:00:00+07', '2026-03-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-002)', '2026-03-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '58d9c103-b360-5bb6-ab01-4c158ca1b4fc', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-05-28 00:00:00+07', '2025-05-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-05-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fbe85ea5-da93-57bf-b499-7f3651d388b8', i.id, 'Rizqi Asy’ari Ramadhan', 'internal', 'self', '2025-06-19 00:00:00+07', '2025-06-19 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-06-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2be8c073-b2e2-5694-b96d-f4794da6cbf7', i.id, 'Aisyah Ramadhani', 'internal', 'self', '2025-07-08 00:00:00+07', '2025-07-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-07-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c153734a-0301-5b27-b4df-beb8fcbed8c9', i.id, 'Mutiara Alifia R', 'internal', 'self', '2025-07-29 00:00:00+07', '2025-07-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-07-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cf8b9f2f-1842-5000-8639-65e8c1f51b8e', i.id, 'Bagus Dwi Putra Atmaja', 'internal', 'self', '2025-08-14 00:00:00+07', '2025-08-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-08-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3474f16-1a5d-58d2-a424-bb5e7cc9aa23', i.id, 'Devi Ramdani', 'internal', 'self', '2025-09-03 00:00:00+07', '2025-09-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-09-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3907b317-2909-53ea-a046-77c85fbf7d22', i.id, 'Les’ Aullian Achmad Argito', 'internal', 'self', '2025-09-22 00:00:00+07', '2025-09-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-09-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ee902906-7359-5d19-892a-37fda9e74b1f', i.id, 'Briliyan Hartanti', 'internal', 'self', '2025-10-09 00:00:00+07', '2025-10-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-10-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd56e6c84-77bc-5fab-a83a-301eaf585ce5', i.id, 'Arinda Fadea Pramaesela', 'internal', 'self', '2025-10-30 00:00:00+07', '2025-10-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-10-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6fdb1892-7def-5249-94bc-6fbf6696a430', i.id, 'M. Fajar Ridho Ilham', 'internal', 'self', '2025-11-18 00:00:00+07', '2025-11-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-11-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '27ad960a-ad2f-5463-b255-9e821b4dcc84', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-12-09 00:00:00+07', '2025-12-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2025-12-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5baf55c3-9ef0-5d85-b1d9-53c646c747b5', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-01-07 00:00:00+07', '2026-01-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2026-01-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3cef81b-efef-5810-adef-3704315164d9', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-01-26 00:00:00+07', '2026-01-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2026-01-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'be11d95d-6529-5ec5-a787-d65845895bd1', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-11 00:00:00+07', '2026-02-11 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2026-02-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '55ef0cfc-bb00-59f7-893b-fbf637c072ea', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-24 00:00:00+07', '2026-02-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2026-02-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '721d0eba-497e-5f0f-9ece-bba3c5ff6a6b', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-05 00:00:00+07', '2026-03-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-003)', '2026-03-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-118-soil-measurement-ph-portable-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0061cac1-da74-5a38-977b-10b8c13d098f', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-01-13 00:00:00+07', '2025-01-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-01-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '65683f3b-0bd9-5aae-8ae8-184aaf99c981', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-02-07 00:00:00+07', '2025-02-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-02-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '34ddf43e-c2f0-5644-baed-eeb8988cc2f8', i.id, 'Arifah Haryani', 'internal', 'self', '2025-05-04 00:00:00+07', '2025-05-11 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-05-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cc7380e3-0672-52fe-8a00-de2d5df0baf2', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-05-20 00:00:00+07', '2025-05-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-05-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0b3f2c35-42f7-5a1f-8f93-0f773d5965a6', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-05-26 00:00:00+07', '2025-05-27 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-05-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b148ea89-ac58-5876-9ea8-f055fafcd87b', i.id, 'Les’ Aullian Achmad Argito', 'internal', 'self', '2025-06-02 00:00:00+07', '2025-06-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-06-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '886f5bdc-891a-5cd5-b62a-7e62ec7f9a4d', i.id, 'Bagus Dwi Putra Atmaja', 'internal', 'self', '2025-06-09 00:00:00+07', '2025-06-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-06-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '88b1cfc2-116f-5fe2-858b-9dae39a767ae', i.id, 'Aisyah Ramadhani', 'internal', 'self', '2025-06-16 00:00:00+07', '2025-06-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-06-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b70b765f-fe96-5f8e-a64d-0d039e184bdd', i.id, 'Zakha Wardana Saputra', 'internal', 'self', '2025-06-24 00:00:00+07', '2025-06-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-06-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '1d4340c9-f3f8-50f7-81ca-e4d47815964f', i.id, 'Devi Ramdani', 'internal', 'self', '2025-07-01 00:00:00+07', '2025-07-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-07-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'efd944b5-dfa0-5e74-95ca-605ee659651c', i.id, 'Rizqi Asy’ari Ramadhan', 'internal', 'self', '2025-07-08 00:00:00+07', '2025-07-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-07-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3a62319-67d6-5da6-b8af-62da3c30a550', i.id, 'Briliyan Hartanti', 'internal', 'self', '2025-07-14 00:00:00+07', '2025-07-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-07-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '94f2e750-b3a7-5336-acf9-bbd621a2e0cf', i.id, 'Mutiara Alifia R', 'internal', 'self', '2025-07-22 00:00:00+07', '2025-07-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-07-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '684a9f3a-00ce-51b6-abfb-7e7f51fc3b2b', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-07-30 00:00:00+07', '2025-07-31 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-07-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd1f2a5c6-5607-55ba-a7fe-327b2387ef3a', i.id, 'Shidqon Fathul Muqorrobin', 'internal', 'self', '2025-08-06 00:00:00+07', '2025-08-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-08-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '7b27d6d5-be65-5054-8ef2-228dab1b7523', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-08-14 00:00:00+07', '2025-08-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-08-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd5d3654a-cffb-52d0-9651-8791760b891b', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-08-21 00:00:00+07', '2025-08-23 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-08-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '91cdcb17-7a50-5d0e-b937-534b403eea7e', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-09-02 00:00:00+07', '2025-09-04 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-09-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6dc7d920-5247-5ba1-8f26-b0368675743a', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-09-10 00:00:00+07', '2025-09-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-09-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '75f1051b-106e-5a5d-b81e-cfe6106e14ca', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-09-18 00:00:00+07', '2025-09-19 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-09-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cd48a9c6-d9b4-57c9-94f8-abf6b94a4823', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-09-25 00:00:00+07', '2025-09-27 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-09-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f6fad14c-f6ec-55d7-a0ed-2d1c30c46008', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-10-06 00:00:00+07', '2025-10-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-10-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e895bad0-678e-5ae7-9cb8-fd05a3fc61f5', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-10-15 00:00:00+07', '2025-10-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-10-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4e8af6be-f8f8-5514-a597-9463d24e0a9b', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-10-27 00:00:00+07', '2025-10-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-10-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4987fe35-0900-50c4-87ab-04196c364c46', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-11-10 00:00:00+07', '2025-11-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-11-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ece488a6-83d3-59a9-8a25-3c938d1e7293', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-12-02 00:00:00+07', '2025-12-04 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2025-12-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b49ed2a1-1916-56fc-b457-e15c2e1420c8', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2026-01-08 00:00:00+07', '2026-01-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2026-01-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fed93b37-c8cb-5c27-8e61-ee5d1a351e26', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2026-01-27 00:00:00+07', '2026-01-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2026-01-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f08ae3d7-7f46-5d53-a772-4bc91795f84a', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2026-02-16 00:00:00+07', '2026-02-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2026-02-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '45016536-185d-5bb2-98b9-cbb8d18a1068', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2026-03-05 00:00:00+07', '2026-03-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-004)', '2026-03-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fdfe7307-b202-5124-bfe4-fcfeb54b0d1c', i.id, 'M. Fajar Ridho Ilham', 'internal', 'self', '2025-09-02 00:00:00+07', '2025-09-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-09-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '28726a5a-6dd3-5f81-97d2-fe34944db89f', i.id, 'Les’ Aullian Achmad Argito', 'internal', 'self', '2025-09-17 00:00:00+07', '2025-09-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-09-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a7785436-cac4-5b36-906b-c1c4d32ed33c', i.id, 'Mutiara Alifia R', 'internal', 'self', '2025-06-10 00:00:00+07', '2025-06-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-06-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '9448fd4f-9cd2-5713-8afa-6e0e849f9943', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-06-24 00:00:00+07', '2025-06-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-06-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd757b060-dabb-5b8a-ac1e-c50f2e17f181', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-07-01 00:00:00+07', '2025-07-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-07-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '09dfac54-6432-5175-afdc-21c3fe16182a', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-07-08 00:00:00+07', '2025-07-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-07-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b19060aa-18f0-55e6-a5e2-885c7f7de0c7', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-07-15 00:00:00+07', '2025-07-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-07-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '9a78f676-cae1-5023-b2bc-98a73ba4822b', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-07-22 00:00:00+07', '2025-07-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-07-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e94760eb-319e-570c-a8fa-c124867002d3', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-07-29 00:00:00+07', '2025-07-31 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-07-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5fb3f78c-5d3b-50c3-87c7-57545cc06675', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-08-05 00:00:00+07', '2025-08-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-08-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd41314dd-448f-5001-a34b-a738a5b37564', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-08-12 00:00:00+07', '2025-08-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-08-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e909f3e9-91b0-5a08-b65d-b719f0012422', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-08-19 00:00:00+07', '2025-08-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-08-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3a84d912-4b98-594e-b605-4f22dc2bb925', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-08-27 00:00:00+07', '2025-08-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-08-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd44db501-224c-585b-9b3e-985ad9ef87d4', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-09-03 00:00:00+07', '2025-09-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-09-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8d1f8aca-0927-5e2c-ad5e-5842bde9d627', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-09-11 00:00:00+07', '2025-09-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-09-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '1423737c-d07c-5202-b7cd-d3cd6d4aa77d', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-09-30 00:00:00+07', '2025-10-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-09-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8f25ad34-aadb-5895-80b7-d6d56d258058', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-10-07 00:00:00+07', '2025-10-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-10-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f26692a6-fbaf-5bfa-8d9f-cc3cf57ce5dd', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-10-14 00:00:00+07', '2025-10-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-10-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8132e771-c771-5ca2-befe-ffd6e1dcf0bc', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-10-21 00:00:00+07', '2025-10-23 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-10-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b9792334-a88e-5993-a75a-0bc9e2dea899', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-10-28 00:00:00+07', '2025-10-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-10-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6f235555-489c-51f1-b260-ba77653b46d5', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-11-04 00:00:00+07', '2025-11-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-11-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3ee4e98-5401-58f5-8f0b-316275a094fe', i.id, 'Aisyah Ramadhani', 'internal', 'self', '2025-11-12 00:00:00+07', '2025-11-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-11-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'bf71b646-c080-5e4e-8289-278312c07d8f', i.id, 'Zakha Wardana Saputra', 'internal', 'self', '2025-11-19 00:00:00+07', '2025-11-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-11-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '905343a2-661a-5816-8310-850e2de8b5ac', i.id, 'Rizqi Asy’ari Ramadhan', 'internal', 'self', '2025-11-26 00:00:00+07', '2025-11-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-11-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5b7e7e15-afcb-5994-ad6c-5a302bfb6be0', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2025-12-03 00:00:00+07', '2025-12-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-12-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8d6603db-a041-50dd-b7da-6f4c78dfbdbc', i.id, 'Ilham Mubarok', 'internal', 'self', '2025-12-10 00:00:00+07', '2025-12-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-12-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '979c3466-10d0-5cc5-b721-83b8d9234705', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2025-12-17 00:00:00+07', '2025-12-19 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2025-12-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c5537e34-4fc7-540a-a7a5-178deab1aaf0', i.id, 'Samuel Gatot Marseno', 'internal', 'self', '2026-01-07 00:00:00+07', '2026-01-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cbfb8b77-47d4-5bf3-9e0c-210a8291ed3e', i.id, 'Saifuddin Afif', 'internal', 'self', '2026-01-14 00:00:00+07', '2026-01-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'dd98d83e-64ef-547d-8c93-aadd5b946e43', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-01-20 00:00:00+07', '2026-01-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '82406f56-01ad-5a0a-b37c-7d68307c048d', i.id, 'Ilham Mubarok', 'internal', 'self', '2026-01-24 00:00:00+07', '2026-01-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c734bb87-5703-59db-9220-0e999df171fc', i.id, 'Hammam Mananda Harahap', 'internal', 'self', '2026-01-28 00:00:00+07', '2026-01-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '49b76cb7-4964-5a6d-b796-081ec8642b99', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-01-31 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c1cb8b42-3dad-562b-8ea8-9b924675f0f7', i.id, 'Ilham Mubarok', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-01-31 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b9ac8626-9abf-51aa-8f74-0b58e82656bc', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-04 00:00:00+07', '2026-02-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'cb2cbfec-6171-507c-98a2-657b8b80a780', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-08 00:00:00+07', '2026-02-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2981da41-a6e3-5a5f-8da0-42534f387b94', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-12 00:00:00+07', '2026-02-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3cb87fee-96a6-5628-865a-4cadce08a9bd', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-16 00:00:00+07', '2026-02-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3162c718-cbd8-5378-81b1-e73f16389149', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-20 00:00:00+07', '2026-02-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd42f1d17-3ea7-5705-8914-d556da6411ac', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-24 00:00:00+07', '2026-02-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3b0724a8-d64d-5f93-8963-15b96c9aa5d2', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-02-28 00:00:00+07', '2026-02-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-02-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3308dce-d0bb-51c0-9c20-e957ea7de920', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-01 00:00:00+07', '2026-03-01 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2f8cf91c-850c-5851-96c3-87d9b100a4ee', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-02 00:00:00+07', '2026-03-02 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e74795c7-f420-582e-91ff-5e6d683f7318', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-03 00:00:00+07', '2026-03-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '385fdf30-49ec-5a2a-a24d-b7196987b983', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-04 00:00:00+07', '2026-03-04 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ed72db95-d923-5d1d-8901-ab703fb78d12', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-05 00:00:00+07', '2026-03-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b386ea4f-0233-5271-ba34-bd2f1eed294b', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-06 00:00:00+07', '2026-03-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4cbd797a-fcd1-57a2-8b80-fa425a04cbe7', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-07 00:00:00+07', '2026-03-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '53e0c562-ab22-52b2-8cbe-7a3e364e70b3', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-08 00:00:00+07', '2026-03-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4b66b384-a50c-5772-920a-11602fb33106', i.id, 'Faiz Ridwan Pratama', 'internal', 'self', '2026-03-10 00:00:00+07', '2026-03-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-005)', '2026-03-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-105-chlorophyll-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'be921851-230d-528d-a685-84ae671ca23f', i.id, 'Nadwah Raidah Shabrina', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f44e2198-2ab8-593a-9fbe-b0d11386ea65', i.id, 'Annisa Nur Indah Sari', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '848d9c47-8baf-59df-9b3b-440fd5624e86', i.id, 'Athiyya Maharani Ardiningrum', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '73f8d5fb-ffa2-5074-b6ad-4f3fb988da08', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '729c1b72-f867-5cd2-b55b-9b5e2557c3b7', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b75088c7-70a8-544a-9df9-d662131c08c4', i.id, 'Samuel Gatot Marseno', 'internal', 'self', '2025-12-07 00:00:00+07', '2025-12-11 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-12-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '74d16a43-be7c-5b8f-8716-50fe01987b9d', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-03-10 00:00:00+07', '2026-03-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-03-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'adcfe9ca-8b41-5e88-b9fe-4dfadc193a1c', i.id, 'Rizqi Asy’ari Ramadhan', 'internal', 'self', '2025-05-18 00:00:00+07', '2025-05-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-05-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'fede5b02-199a-546f-9e05-b3d482300725', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2025-06-04 00:00:00+07', '2025-06-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-06-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b5fc7c56-aa57-5b64-bbfe-6516ed83abc2', i.id, 'Zakha Wardana Saputra', 'internal', 'self', '2025-07-22 00:00:00+07', '2025-07-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-07-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '43538d26-d0a3-5bd0-96e2-f4a36e2ffedc', i.id, 'Aisyah Ramadhani', 'internal', 'self', '2025-08-13 00:00:00+07', '2025-08-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-08-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '43ea9295-4c6b-5c2e-a901-6fa42ab276ca', i.id, 'Briliyan Hartanti', 'internal', 'self', '2025-09-09 00:00:00+07', '2025-09-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-09-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'af66b345-91ed-5f1a-9c46-003a84947636', i.id, 'Mutiara Alifia R', 'internal', 'self', '2025-10-21 00:00:00+07', '2025-10-23 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-10-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'aaa6f50b-3def-5292-807f-2f5d900a150c', i.id, 'Devi Ramdani', 'internal', 'self', '2025-11-05 00:00:00+07', '2025-11-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-11-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ceea3811-923f-54a4-805b-e3f5cad1b307', i.id, 'Shidqon Fatul', 'internal', 'self', '2025-11-18 00:00:00+07', '2025-11-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2025-11-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'aedb94e9-16ad-503d-8989-f8f8c50c152b', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-01-03 00:00:00+07', '2026-01-05 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-01-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f04b14b9-ca40-523d-9a18-ec80461afa43', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-01-14 00:00:00+07', '2026-01-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-01-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3fe55ac1-772a-5d91-84f0-33e89ccec3b2', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-01-28 00:00:00+07', '2026-01-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-01-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '7d2f5848-58ec-52b6-a909-2ec9d2cbadf5', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-02-06 00:00:00+07', '2026-02-08 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-02-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd7f2be33-655d-5fff-9cc9-ea2278dad600', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-02-15 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-02-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f3b5095e-6926-5aa0-89ff-4da183679614', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-02-22 00:00:00+07', '2026-02-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-02-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a4b2a2d9-9f4f-56ce-b475-d427e053827b', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-03-01 00:00:00+07', '2026-03-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-03-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2bab3659-480e-5e6a-a9ac-7f1faf69a862', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-03-05 00:00:00+07', '2026-03-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-03-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6eb57949-f53f-55b1-b738-380b2ebab91c', i.id, 'Shidqon Fatul', 'internal', 'self', '2026-03-09 00:00:00+07', '2026-03-11 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-006)', '2026-03-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-106-produce-quality-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '86f78bf4-ed2a-5125-8799-de8b7440d680', i.id, 'Nadwah Raidah Shabrina', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e55459f4-4c5f-516f-afb1-5467d7982e8e', i.id, 'Annisa Nur Indah Sari', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '38012293-4937-5cb8-87dd-b4d7f73c26b0', i.id, 'Athiyya Maharani Ardiningrum', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5f1bd7ac-40ca-5494-966f-fb56ef52fa38', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8639955e-6ce6-5dde-943d-104abcae0e03', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '93109f98-7bb8-5fbe-b1e8-9ec0510ee1c3', i.id, 'Samuel Gatot Marseno', 'internal', 'self', '2025-05-12 00:00:00+07', '2025-05-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-05-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e7029b18-7e12-5437-88dd-143de5352b89', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-05-27 00:00:00+07', '2025-05-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-05-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '58afea4d-2bd8-5ee7-abdc-7a30fc8a81c7', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-06-10 00:00:00+07', '2025-06-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-06-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a73729fd-d841-5994-a525-acabd9275655', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-06-24 00:00:00+07', '2025-06-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-06-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'f9698a26-a82d-516e-afea-a89782fc524b', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-07-08 00:00:00+07', '2025-07-10 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-07-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '9f9fbf15-ce0b-571b-b7b2-6a7dd41f3e32', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2025-07-22 00:00:00+07', '2025-07-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-07-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '26936a14-67f4-554b-84d6-8c4f8b093409', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-08-05 00:00:00+07', '2025-08-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-08-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '84930bbf-9773-59d0-a560-d90d7b3e3153', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2025-08-19 00:00:00+07', '2025-08-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-08-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'abff0a8e-1ba1-536e-a063-3adaab88d957', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-09-02 00:00:00+07', '2025-09-04 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-09-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '23d1eebf-ff5d-5dfa-be0e-6b74c8fe57c7', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-09-16 00:00:00+07', '2025-09-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-09-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '033fca89-24a8-58d0-adfc-4291b8d16821', i.id, 'Masarra Adidefitria', 'internal', 'self', '2025-10-03 00:00:00+07', '2025-10-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-10-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0438796b-9341-5ee8-b812-347e55094eab', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2025-11-11 00:00:00+07', '2025-11-13 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2025-11-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '026e3a0a-7544-5ffe-b132-cad6cee2ee9a', i.id, 'Tarisha Lindira Hilman', 'internal', 'self', '2026-01-27 00:00:00+07', '2026-01-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-007)', '2026-01-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-107-gas-analyzer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '670fe8a9-ad9a-5c42-a2a4-276b07564478', i.id, 'Ririn Febri Kusumawardani', 'internal', 'self', '2025-01-01 00:00:00+07', '2025-06-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2025-01-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '49a8a042-2006-5066-bfd4-50408bbbc539', i.id, 'Kevin Ezekiel Manik', 'internal', 'self', '2025-09-13 00:00:00+07', '2025-09-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2025-09-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'ec53de4b-7cb3-5f6c-ab6e-7d2896dc9cf5', i.id, 'Hammam Mananda H', 'internal', 'self', '2025-12-01 00:00:00+07', '2026-03-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2025-12-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'bbd5047c-3d32-5cb2-95c3-0a310701b4b6', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-01-22 00:00:00+07', '2026-01-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-01-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0e119f0a-7c0e-59cc-97d3-9945a4484c67', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-03 00:00:00+07', '2026-02-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b4c36762-ca41-5843-8c4c-38e8ba9df15a', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-07 00:00:00+07', '2026-02-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e595909b-59ac-5012-89d8-5f72bd2e6cdd', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-12 00:00:00+07', '2026-02-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '59860f07-8236-55dc-a9b7-1c7f8881324c', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-17 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '6e3a04b5-05f9-5ca2-814f-6a7b355ba2b1', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-21 00:00:00+07', '2026-02-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '58b32a85-a311-5f93-bcdc-cbc14cfd8e59', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-25 00:00:00+07', '2026-02-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3135e3d2-afbc-5641-860c-babe82e61b53', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-02-28 00:00:00+07', '2026-02-28 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-02-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e1c7f530-7189-51db-a441-48d918922ec8', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-03-03 00:00:00+07', '2026-03-03 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-03-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '8c61378a-2a93-5c50-bd08-ed834a9e7c70', i.id, 'Ririn Febri Kusuma', 'internal', 'self', '2026-03-07 00:00:00+07', '2026-03-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-008)', '2026-03-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd2a0cd68-e188-5989-97fb-1ffb018a5d3a', i.id, 'Saifuddin Afif', 'internal', 'self', '2025-05-12 00:00:00+07', '2025-05-15 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-009)', '2025-05-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '934328bc-b06d-507f-a85b-6d8cc41f25b6', i.id, 'Kevin Ezekiel Manik', 'internal', 'self', '2025-09-13 00:00:00+07', '2025-09-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-009)', '2025-09-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '988423a8-2f9b-5887-b06d-083abf4ca3c2', i.id, 'Hammam Mananda H', 'internal', 'self', '2025-12-01 00:00:00+07', '2026-03-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-009)', '2025-12-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '60c5c1de-ae0e-594b-93f0-46d1574105a4', i.id, 'Anggit Wijanarko', 'internal', 'self', '2025-08-12 00:00:00+07', '2025-08-18 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-010)', '2025-08-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '23ff9e64-ce25-57dc-9bdc-6041f487f617', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-01-22 00:00:00+07', '2025-01-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-011)', '2025-01-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-109-hyperspectral-imaging-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '17604168-3523-51e1-911e-13b842550634', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-03-04 00:00:00+07', '2025-03-04 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-011)', '2025-03-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-109-hyperspectral-imaging-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c1c255ae-2d51-5425-8cae-b06d78096402', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-08-25 00:00:00+07', '2025-08-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-011)', '2025-08-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-109-hyperspectral-imaging-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '45c8c120-9c7b-5ad0-82e9-d90cb2a2cb1d', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-09-12 00:00:00+07', '2025-09-12 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-011)', '2025-09-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-109-hyperspectral-imaging-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '70477d86-c55b-5cc2-8b8d-d527ab280932', i.id, 'Muhammad Fajar Ridho Ilham', 'internal', 'self', '2025-09-19 00:00:00+07', '2025-09-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-011)', '2025-09-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-109-hyperspectral-imaging-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '849d7916-7aab-5d8e-a9b0-9c531836afd0', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-01-14 00:00:00+07', '2025-01-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2025-01-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '27f6f27f-a932-5e07-9410-2a5eb1cef29b', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-01-04 00:00:00+07', '2025-01-14 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2025-01-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '2f572d40-0078-58d3-96e4-37029faa7af1', i.id, 'Arifah Haryani', 'internal', 'self', '2025-08-07 00:00:00+07', '2025-08-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2025-08-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4195d3c2-0896-542b-bb78-8b61e5cbe118', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-08-18 00:00:00+07', '2025-08-24 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2025-08-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '3dc734a4-39ff-5917-945f-6bb35480f0bc', i.id, 'Arifah Haryani', 'internal', 'self', '2025-09-03 00:00:00+07', '2025-09-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2025-09-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0b93e10a-fe27-5c68-b0ec-3e783c7551c8', i.id, 'Diena Ita''ul Mufida', 'internal', 'self', '2026-01-20 00:00:00+07', '2026-01-26 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2026-01-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '954a11ce-4621-57f9-9af6-b2227fe0ba23', i.id, 'Saifuddin Afif', 'internal', 'self', '2026-06-29 00:00:00+07', '2026-06-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-020)', '2026-06-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-123-spectrometer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a8df01ed-f36b-5ea4-a331-40184e47e42a', i.id, 'Saifuddin Afif', 'internal', 'self', '2025-02-06 00:00:00+07', '2025-02-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-021)', '2025-02-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-119-par-package'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '128c92e0-e868-5437-822d-b30d7fade4d0', i.id, 'Bagus Dwi', 'internal', 'self', '2025-04-23 00:00:00+07', '2025-04-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-021)', '2025-04-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-119-par-package'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'b9e5158c-1cfc-54cc-b319-5726ee2ff9c3', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-01-16 00:00:00+07', '2025-01-16 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-01-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '0407b5ca-0832-5ac0-971e-5a7bde8fc248', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-01-20 00:00:00+07', '2025-01-20 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-01-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '028bf1b3-d642-5e67-87e6-ba9e87fd4c28', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-01-21 00:00:00+07', '2025-01-22 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-01-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e011d4db-5e73-57af-ad8e-fabacf36fc1c', i.id, 'Yusuf Arapenta Ras Bangun', 'internal', 'self', '2025-06-01 00:00:00+07', '2025-06-30 00:00:00+07', 'returned', 'Tombol navigasi up tidak bisa', 'Tombol navigasi up tidak bisa', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-06-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a19967ca-34be-54b0-9abd-9231674607ab', i.id, 'M Fajar RIdho', 'internal', 'self', '2025-07-04 00:00:00+07', '2025-07-05 00:00:00+07', 'returned', 'Tombol navigasi up tidak bisa', 'Tombol Navigasi UP Rusak', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-07-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '83373319-d367-5c56-9984-90861a08b261', i.id, 'Les Aulian', 'internal', 'self', '2025-08-01 00:00:00+07', '2025-09-20 00:00:00+07', 'returned', 'Tombol navigasi up tidak bisa', 'Tombol navigasi up tidak bisa', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-08-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'bbfad6d4-0dfa-5b03-b061-055f1f4f7224', i.id, 'Diena Ita''ul mufida', 'internal', 'self', '2026-01-20 00:00:00+07', '2026-01-26 00:00:00+07', 'returned', 'Tombol navigasi up tidak bisa', 'Tombol navigasi up tidak bisa', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2026-01-20 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c90b3604-b91c-5830-a9aa-c6aafdb4a25f', i.id, 'Mutiara Alifia Ramadhanty', 'internal', 'self', '2025-06-10 00:00:00+07', '2025-10-07 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-022)', '2025-06-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-104-porometer-fluorometers'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '30c6516c-e703-5fae-b912-7dce4e05ea73', i.id, 'Saifuddin Afif', 'internal', 'self', '2025-02-06 00:00:00+07', '2025-02-09 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-023)', '2025-02-06 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-120-daily-light-integral-package'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'c51b0e60-eefa-5fac-95b1-86fe12609aa9', i.id, 'Bagus Dwi', 'internal', 'self', '2025-04-23 00:00:00+07', '2025-04-29 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-023)', '2025-04-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-120-daily-light-integral-package'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'efc86d9c-9e3c-5138-b5dc-0faf4e11b542', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-07-14 00:00:00+07', '2025-07-17 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-024)', '2025-07-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-117-portable-leaf-area-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '62b3d4c2-e994-5fc9-b973-959d2cc8f759', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-08-10 00:00:00+07', '2025-08-31 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-024)', '2025-08-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-117-portable-leaf-area-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '5d9e9624-b22f-5136-9df8-a1e92e757c45', i.id, 'Muhammad Fajar Ridho', 'internal', 'self', '2025-09-04 00:00:00+07', '2025-09-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-024)', '2025-09-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-117-portable-leaf-area-meter'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'e7103319-c47a-53b9-aff1-6b06aa446309', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-01-21 00:00:00+07', '2025-01-21 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-01-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '492519e2-aa97-54ab-93cd-9bfaf5cc4939', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-01-25 00:00:00+07', '2025-02-19 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-01-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '30aac07e-02bd-5395-b92f-ab9410ca41b7', i.id, 'Zuhrotul Maulidah', 'internal', 'self', '2025-02-25 00:00:00+07', '2025-02-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-02-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '08adf1b1-fe28-5482-9d58-e4d2ef30eb14', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-07-02 00:00:00+07', '2025-07-06 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-07-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '4a8f816c-d4d4-5ded-b8c4-19e1c5efd2ce', i.id, 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-07-19 00:00:00+07', '2025-07-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-07-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select '80049c25-c9e4-5f2d-91eb-ecaf08f3fe7f', i.id, 'Saifuddin Afif', 'internal', 'self', '2025-08-12 00:00:00+07', '2025-08-30 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2025-08-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a4e738e0-a359-5cd1-878b-c0a16e3255af', i.id, 'Ilva Khairunnisa', 'internal', 'self', '2026-01-16 00:00:00+07', '2026-01-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2026-01-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'd5382c8f-0dd3-55ea-a7c7-06d428b4b568', i.id, 'Aisyah Ramadhani', 'internal', 'self', '2026-01-16 00:00:00+07', '2026-01-25 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2026-01-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, condition_out, condition_in, notes, created_at)
select 'a0877e18-9e89-53a8-b615-b97b014bc977', i.id, 'Samuel Gatot Marseno', 'internal', 'self', '2026-04-29 00:00:00+07', '2026-05-01 00:00:00+07', 'returned', 'Baik', 'Baik', 'Imported from PUAPT logbook (unit 2024-5A-025)', '2026-04-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-116-portable-photosynthesis-system'
on conflict (id) do nothing;
