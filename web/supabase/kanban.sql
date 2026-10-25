-- Kanban boards for the team (/kanban). Design: docs/kanban/design.md.
-- Access is per board: owner | member | viewer (board_members), plus an
-- implicit viewer role for every signed-in user on boards with
-- visibility = 'team'. Every child table carries board_id (filled by trigger,
-- never trusted from the client) so RLS is one function call and Realtime can
-- filter on board_id. Activity rows are written only by triggers.
-- Run once in the Supabase SQL editor. Safe to re-run. Member names and
-- avatars come from profiles.sql; without it members show as unnamed.

-- 1. Tables -----------------------------------------------------------------
create table if not exists public.kanban_boards (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  name         text not null check (length(trim(name)) > 0),
  description  text not null default '',
  background   text not null default 'teal',      -- key of BOARD_BACKGROUNDS in lib/kanban.ts
  visibility   text not null default 'private' check (visibility in ('private', 'team')),
  card_seq     integer not null default 0,         -- last card number handed out on this board
  created_by   uuid not null default auth.uid() references auth.users (id),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create table if not exists public.kanban_board_members (
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  starred   boolean not null default false,        -- per-user preference
  added_at  timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.kanban_lists (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references public.kanban_boards (id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  pos          double precision not null,
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create table if not exists public.kanban_labels (
  id        uuid primary key default gen_random_uuid(),
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  name      text not null default '',              -- may be empty: colour-only label
  color     text not null check (color in ('teal', 'cyan', 'mint', 'green', 'lime', 'amber', 'orange', 'red', 'violet', 'slate'))
);

create table if not exists public.kanban_cards (
  id                   uuid primary key default gen_random_uuid(),
  board_id             uuid not null references public.kanban_boards (id) on delete cascade, -- derived from list_id
  list_id              uuid not null references public.kanban_lists (id) on delete cascade,
  number               integer not null,           -- per-board sequence, used in the card URL
  title                text not null check (length(trim(title)) > 0),
  description          text not null default '',   -- markdown
  pos                  double precision not null,
  start_at             timestamptz,
  due_at               timestamptz,
  due_complete         boolean not null default false,
  cover_attachment_id  uuid,
  cover_color          text,
  created_by           uuid default auth.uid() references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  archived_at          timestamptz,
  unique (board_id, number)
);

create table if not exists public.kanban_card_labels (
  card_id   uuid not null references public.kanban_cards (id) on delete cascade,
  label_id  uuid not null references public.kanban_labels (id) on delete cascade,
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists public.kanban_card_members (
  card_id   uuid not null references public.kanban_cards (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  primary key (card_id, user_id)
);

create table if not exists public.kanban_checklists (
  id        uuid primary key default gen_random_uuid(),
  card_id   uuid not null references public.kanban_cards (id) on delete cascade,
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  title     text not null default 'Checklist',
  pos       double precision not null
);

create table if not exists public.kanban_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.kanban_checklists (id) on delete cascade,
  board_id      uuid not null references public.kanban_boards (id) on delete cascade,
  text          text not null check (length(trim(text)) > 0),
  pos           double precision not null,
  done          boolean not null default false,
  due_at        timestamptz,
  assignee_id   uuid references auth.users (id) on delete set null
);

create table if not exists public.kanban_card_comments (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.kanban_cards (id) on delete cascade,
  board_id    uuid not null references public.kanban_boards (id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (length(trim(body)) > 0), -- markdown
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);

create table if not exists public.kanban_card_attachments (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.kanban_cards (id) on delete cascade,
  board_id      uuid not null references public.kanban_boards (id) on delete cascade,
  name          text not null,
  storage_path  text,                              -- object in the 'kanban' bucket; null for a link
  url           text,                              -- external link when storage_path is null
  mime_type     text,
  bytes         bigint,
  uploaded_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (storage_path is not null or url is not null)
);

-- No FK on card_id: the log outlives a deleted card.
create table if not exists public.kanban_card_activity (
  id          bigint generated always as identity primary key,
  board_id    uuid not null references public.kanban_boards (id) on delete cascade,
  card_id     uuid,                                -- null for board/list-level events
  actor_id    uuid references auth.users (id) on delete set null,
  type        text not null,                       -- card.created | card.moved | label.added | ...
  data        jsonb not null default '{}',         -- names and previous values at the time
  created_at  timestamptz not null default now()
);

create index if not exists kanban_board_members_user_idx on public.kanban_board_members (user_id);
create index if not exists kanban_lists_board_idx        on public.kanban_lists (board_id, pos);
create index if not exists kanban_labels_board_idx       on public.kanban_labels (board_id);
create index if not exists kanban_cards_list_idx         on public.kanban_cards (list_id, pos);
create index if not exists kanban_cards_board_idx        on public.kanban_cards (board_id);
create index if not exists kanban_card_labels_board_idx  on public.kanban_card_labels (board_id);
create index if not exists kanban_card_members_board_idx on public.kanban_card_members (board_id);
create index if not exists kanban_checklists_card_idx    on public.kanban_checklists (card_id);
create index if not exists kanban_items_checklist_idx    on public.kanban_checklist_items (checklist_id);
create index if not exists kanban_comments_card_idx      on public.kanban_card_comments (card_id, created_at);
create index if not exists kanban_attachments_card_idx   on public.kanban_card_attachments (card_id);
create index if not exists kanban_activity_board_idx     on public.kanban_card_activity (board_id, created_at desc);
create index if not exists kanban_activity_card_idx      on public.kanban_card_activity (card_id, created_at desc);

-- 2. Access helpers -----------------------------------------------------------
-- security definer so policies can read board_members without recursing into
-- its own RLS.
create or replace function public.kanban_role(b uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select m.role from public.kanban_board_members m
      where m.board_id = b and m.user_id = auth.uid()),
    (select 'viewer' from public.kanban_boards x
      where x.id = b and x.visibility = 'team' and auth.uid() is not null)
  );
$$;

create or replace function public.kanban_can_read(b uuid)
returns boolean language sql stable as $$ select public.kanban_role(b) is not null $$;

create or replace function public.kanban_can_edit(b uuid)
returns boolean language sql stable as $$ select public.kanban_role(b) in ('owner', 'member') $$;

-- Board id from a storage path '{board_id}/{card_id}/{file}', null if malformed.
create or replace function public.kanban_storage_board(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

-- 3. Integrity triggers -------------------------------------------------------
-- New board: creator becomes owner and gets six colour-only starter labels.
create or replace function public.kanban_board_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.kanban_board_members (board_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (board_id, user_id) do update set role = 'owner';
  insert into public.kanban_labels (board_id, color)
  select new.id, c from unnest(array['green', 'amber', 'orange', 'red', 'violet', 'cyan']) as c;
  return new;
end;
$$;

drop trigger if exists kanban_board_created on public.kanban_boards;
create trigger kanban_board_created after insert on public.kanban_boards
  for each row execute function public.kanban_board_created();

-- Membership guard: only owners change roles, a member may only toggle their
-- own star, and a board always keeps at least one owner.
create or replace function public.kanban_member_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.board_id <> old.board_id or new.user_id <> old.user_id then
      raise exception 'Board membership keys cannot change';
    end if;
    if new.role <> old.role and public.kanban_role(old.board_id) <> 'owner' then
      raise exception 'Only a board owner can change roles';
    end if;
  end if;
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.kanban_boards where id = old.board_id)  -- skip when the board itself is being deleted
     and not exists (select 1 from public.kanban_board_members
                      where board_id = old.board_id and role = 'owner' and user_id <> old.user_id)
  then
    raise exception 'A board needs at least one owner';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists kanban_member_guard on public.kanban_board_members;
create trigger kanban_member_guard before update or delete on public.kanban_board_members
  for each row execute function public.kanban_member_guard();

-- Cards: board_id always follows the list; a new board means a new number.
create or replace function public.kanban_card_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  list_board uuid;
begin
  select board_id into list_board from public.kanban_lists where id = new.list_id;
  if list_board is null then
    raise exception 'List % not found', new.list_id;
  end if;
  if tg_op = 'INSERT' or list_board <> old.board_id then
    new.board_id := list_board;
    update public.kanban_boards set card_seq = card_seq + 1
      where id = list_board returning card_seq into new.number;
  else
    new.board_id := old.board_id;
    new.number := old.number;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kanban_card_defaults on public.kanban_cards;
create trigger kanban_card_defaults before insert or update on public.kanban_cards
  for each row execute function public.kanban_card_defaults();

-- After a card changes board: carry its children over, drop labels of the old
-- board and members who are not on the new one.
create or replace function public.kanban_card_board_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.kanban_card_labels where card_id = new.id;
  delete from public.kanban_card_members cm
    where cm.card_id = new.id
      and not exists (select 1 from public.kanban_board_members m
                       where m.board_id = new.board_id and m.user_id = cm.user_id);
  update public.kanban_card_members      set board_id = new.board_id where card_id = new.id;
  update public.kanban_checklists        set board_id = new.board_id where card_id = new.id;
  update public.kanban_checklist_items i set board_id = new.board_id
    from public.kanban_checklists c where c.id = i.checklist_id and c.card_id = new.id;
  update public.kanban_card_comments     set board_id = new.board_id where card_id = new.id;
  update public.kanban_card_attachments  set board_id = new.board_id where card_id = new.id;
  return new;
end;
$$;

drop trigger if exists kanban_card_board_changed on public.kanban_cards;
create trigger kanban_card_board_changed after update of board_id on public.kanban_cards
  for each row when (old.board_id is distinct from new.board_id)
  execute function public.kanban_card_board_changed();

-- A list moved to another board takes its cards along (re-derives board_id).
create or replace function public.kanban_list_board_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.kanban_cards set list_id = list_id where list_id = new.id;
  return new;
end;
$$;

drop trigger if exists kanban_list_board_changed on public.kanban_lists;
create trigger kanban_list_board_changed after update of board_id on public.kanban_lists
  for each row when (old.board_id is distinct from new.board_id)
  execute function public.kanban_list_board_changed();

-- Children of a card: board_id comes from the card, never from the client.
create or replace function public.kanban_child_board()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'kanban_checklist_items' then
    select board_id into new.board_id from public.kanban_checklists where id = new.checklist_id;
  else
    select board_id into new.board_id from public.kanban_cards where id = new.card_id;
  end if;
  if new.board_id is null then
    raise exception 'Parent not found for %', tg_table_name;
  end if;
  -- Nested ifs: new.label_id / new.user_id exist only on those tables.
  if tg_table_name = 'kanban_card_labels' then
    if not exists (select 1 from public.kanban_labels where id = new.label_id and board_id = new.board_id) then
      raise exception 'Label belongs to another board';
    end if;
  elsif tg_table_name = 'kanban_card_members' then
    if not exists (select 1 from public.kanban_board_members where board_id = new.board_id and user_id = new.user_id) then
      raise exception 'User is not a member of this board';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists kanban_child_board on public.kanban_card_labels;
create trigger kanban_child_board before insert on public.kanban_card_labels
  for each row execute function public.kanban_child_board();
drop trigger if exists kanban_child_board on public.kanban_card_members;
create trigger kanban_child_board before insert on public.kanban_card_members
  for each row execute function public.kanban_child_board();
drop trigger if exists kanban_child_board on public.kanban_checklists;
create trigger kanban_child_board before insert on public.kanban_checklists
  for each row execute function public.kanban_child_board();
drop trigger if exists kanban_child_board on public.kanban_checklist_items;
create trigger kanban_child_board before insert on public.kanban_checklist_items
  for each row execute function public.kanban_child_board();
drop trigger if exists kanban_child_board on public.kanban_card_comments;
create trigger kanban_child_board before insert on public.kanban_card_comments
  for each row execute function public.kanban_child_board();
drop trigger if exists kanban_child_board on public.kanban_card_attachments;
create trigger kanban_child_board before insert on public.kanban_card_attachments
  for each row execute function public.kanban_child_board();

-- Comments: author and card are fixed; edits are timestamped.
create or replace function public.kanban_comment_edit()
returns trigger
language plpgsql
as $$
begin
  new.card_id := old.card_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  if new.body <> old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists kanban_comment_edit on public.kanban_card_comments;
create trigger kanban_comment_edit before update on public.kanban_card_comments
  for each row execute function public.kanban_comment_edit();

-- 4. Activity log (trigger-written only) --------------------------------------
create or replace function public.kanban_log(b uuid, c uuid, kind text, payload jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.kanban_card_activity (board_id, card_id, actor_id, type, data)
  values (b, c, auth.uid(), kind, payload);
$$;
revoke execute on function public.kanban_log(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.kanban_card_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_list text;
  to_list text;
begin
  if tg_op = 'INSERT' then
    select name into to_list from public.kanban_lists where id = new.list_id;
    perform public.kanban_log(new.board_id, new.id, 'card.created',
      jsonb_build_object('title', new.title, 'list', to_list));
  elsif tg_op = 'DELETE' then
    if exists (select 1 from public.kanban_boards where id = old.board_id) then
      perform public.kanban_log(old.board_id, old.id, 'card.deleted',
        jsonb_build_object('title', old.title, 'number', old.number));
    end if;
  else
    if new.list_id <> old.list_id then
      select name into from_list from public.kanban_lists where id = old.list_id;
      select name into to_list from public.kanban_lists where id = new.list_id;
      perform public.kanban_log(new.board_id, new.id, 'card.moved',
        jsonb_build_object('title', new.title, 'from_list', from_list, 'to_list', to_list,
                           'from_board', case when new.board_id <> old.board_id then old.board_id end));
    end if;
    if old.archived_at is null and new.archived_at is not null then
      perform public.kanban_log(new.board_id, new.id, 'card.archived', jsonb_build_object('title', new.title));
    elsif old.archived_at is not null and new.archived_at is null then
      perform public.kanban_log(new.board_id, new.id, 'card.restored', jsonb_build_object('title', new.title));
    end if;
    if new.title <> old.title then
      perform public.kanban_log(new.board_id, new.id, 'card.renamed',
        jsonb_build_object('title', new.title, 'old_title', old.title));
    end if;
    if new.description <> old.description then
      perform public.kanban_log(new.board_id, new.id, 'card.description_changed', jsonb_build_object('title', new.title));
    end if;
    if new.due_at is distinct from old.due_at or new.start_at is distinct from old.start_at then
      perform public.kanban_log(new.board_id, new.id, 'card.dates_changed',
        jsonb_build_object('title', new.title, 'start_at', new.start_at, 'due_at', new.due_at,
                           'old_start_at', old.start_at, 'old_due_at', old.due_at));
    end if;
    if new.due_complete <> old.due_complete then
      perform public.kanban_log(new.board_id, new.id,
        case when new.due_complete then 'card.completed' else 'card.reopened' end,
        jsonb_build_object('title', new.title));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists kanban_card_activity_log on public.kanban_cards;
create trigger kanban_card_activity_log after insert or update or delete on public.kanban_cards
  for each row execute function public.kanban_card_activity_log();

create or replace function public.kanban_list_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.kanban_log(new.board_id, null, 'list.created', jsonb_build_object('list', new.name));
  else
    if new.name <> old.name then
      perform public.kanban_log(new.board_id, null, 'list.renamed',
        jsonb_build_object('list', new.name, 'old_list', old.name));
    end if;
    if old.archived_at is null and new.archived_at is not null then
      perform public.kanban_log(new.board_id, null, 'list.archived', jsonb_build_object('list', new.name));
    elsif old.archived_at is not null and new.archived_at is null then
      perform public.kanban_log(new.board_id, null, 'list.restored', jsonb_build_object('list', new.name));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists kanban_list_activity_log on public.kanban_lists;
create trigger kanban_list_activity_log after insert or update on public.kanban_lists
  for each row execute function public.kanban_list_activity_log();

-- Child rows of a card. Deletes caused by the card itself being deleted (the
-- card row is already gone) are not logged.
create or replace function public.kanban_child_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  card uuid;
  payload jsonb;
  kind text;
begin
  if tg_op = 'DELETE' then
    r := old;
  else
    r := new;
  end if;
  if tg_table_name = 'kanban_checklist_items' then
    select card_id into card from public.kanban_checklists where id = r.checklist_id;
  else
    card := r.card_id;
  end if;
  if card is null or not exists (select 1 from public.kanban_cards where id = card) then
    return null;
  end if;

  if tg_table_name = 'kanban_card_labels' then
    select jsonb_build_object('label', l.name, 'color', l.color) into payload
      from public.kanban_labels l where l.id = r.label_id;
    kind := case when tg_op = 'INSERT' then 'label.added' else 'label.removed' end;
  elsif tg_table_name = 'kanban_card_members' then
    payload := jsonb_build_object('user_id', r.user_id);
    kind := case when tg_op = 'INSERT' then 'member.added' else 'member.removed' end;
  elsif tg_table_name = 'kanban_checklists' then
    payload := jsonb_build_object('checklist', r.title);
    kind := case when tg_op = 'INSERT' then 'checklist.added' else 'checklist.removed' end;
  elsif tg_table_name = 'kanban_checklist_items' then
    if tg_op <> 'UPDATE' or new.done = old.done then
      return null;
    end if;
    payload := jsonb_build_object('item', new.text);
    kind := case when new.done then 'item.completed' else 'item.reopened' end;
  elsif tg_table_name = 'kanban_card_attachments' then
    payload := jsonb_build_object('attachment', r.name);
    kind := case when tg_op = 'INSERT' then 'attachment.added' else 'attachment.removed' end;
  else
    return null;
  end if;

  perform public.kanban_log(r.board_id, card, kind, coalesce(payload, '{}'::jsonb));
  return null;
end;
$$;

drop trigger if exists kanban_child_activity_log on public.kanban_card_labels;
create trigger kanban_child_activity_log after insert or delete on public.kanban_card_labels
  for each row execute function public.kanban_child_activity_log();
drop trigger if exists kanban_child_activity_log on public.kanban_card_members;
create trigger kanban_child_activity_log after insert or delete on public.kanban_card_members
  for each row execute function public.kanban_child_activity_log();
drop trigger if exists kanban_child_activity_log on public.kanban_checklists;
create trigger kanban_child_activity_log after insert or delete on public.kanban_checklists
  for each row execute function public.kanban_child_activity_log();
drop trigger if exists kanban_child_activity_log on public.kanban_checklist_items;
create trigger kanban_child_activity_log after update on public.kanban_checklist_items
  for each row execute function public.kanban_child_activity_log();
drop trigger if exists kanban_child_activity_log on public.kanban_card_attachments;
create trigger kanban_child_activity_log after insert or delete on public.kanban_card_attachments
  for each row execute function public.kanban_child_activity_log();

-- 5. Row level security ---------------------------------------------------------
alter table public.kanban_boards           enable row level security;
alter table public.kanban_board_members    enable row level security;
alter table public.kanban_lists            enable row level security;
alter table public.kanban_labels           enable row level security;
alter table public.kanban_cards            enable row level security;
alter table public.kanban_card_labels      enable row level security;
alter table public.kanban_card_members     enable row level security;
alter table public.kanban_checklists       enable row level security;
alter table public.kanban_checklist_items  enable row level security;
alter table public.kanban_card_comments    enable row level security;
alter table public.kanban_card_attachments enable row level security;
alter table public.kanban_card_activity    enable row level security;

-- Boards: any signed-in user may create one (and becomes its owner).
drop policy if exists "kanban boards read"   on public.kanban_boards;
create policy "kanban boards read" on public.kanban_boards
  for select to authenticated using (public.kanban_can_read(id) or created_by = auth.uid());
drop policy if exists "kanban boards create" on public.kanban_boards;
create policy "kanban boards create" on public.kanban_boards
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "kanban boards update" on public.kanban_boards;
create policy "kanban boards update" on public.kanban_boards
  for update to authenticated
  using (public.kanban_role(id) = 'owner') with check (public.kanban_role(id) = 'owner');
drop policy if exists "kanban boards delete" on public.kanban_boards;
create policy "kanban boards delete" on public.kanban_boards
  for delete to authenticated using (public.kanban_role(id) = 'owner');

-- Members: owners manage; anyone may update their own row (star) or leave.
drop policy if exists "kanban members read"   on public.kanban_board_members;
create policy "kanban members read" on public.kanban_board_members
  for select to authenticated using (public.kanban_can_read(board_id));
drop policy if exists "kanban members add"    on public.kanban_board_members;
create policy "kanban members add" on public.kanban_board_members
  for insert to authenticated with check (public.kanban_role(board_id) = 'owner');
drop policy if exists "kanban members update" on public.kanban_board_members;
create policy "kanban members update" on public.kanban_board_members
  for update to authenticated
  using (public.kanban_role(board_id) = 'owner' or user_id = auth.uid())
  with check (public.kanban_role(board_id) = 'owner' or user_id = auth.uid());
drop policy if exists "kanban members remove" on public.kanban_board_members;
create policy "kanban members remove" on public.kanban_board_members
  for delete to authenticated using (public.kanban_role(board_id) = 'owner' or user_id = auth.uid());

-- Board content: readers see, owners and members edit.
do $$
declare
  t text;
begin
  foreach t in array array['kanban_lists', 'kanban_labels', 'kanban_cards', 'kanban_card_labels',
                           'kanban_card_members', 'kanban_checklists', 'kanban_checklist_items']
  loop
    execute format('drop policy if exists "kanban read" on public.%I', t);
    execute format('create policy "kanban read" on public.%I for select to authenticated using (public.kanban_can_read(board_id))', t);
    execute format('drop policy if exists "kanban write" on public.%I', t);
    execute format('create policy "kanban write" on public.%I for all to authenticated using (public.kanban_can_edit(board_id)) with check (public.kanban_can_edit(board_id))', t);
  end loop;
end;
$$;

-- Comments: editors post as themselves; only the author edits; author or owner deletes.
drop policy if exists "kanban comments read"   on public.kanban_card_comments;
create policy "kanban comments read" on public.kanban_card_comments
  for select to authenticated using (public.kanban_can_read(board_id));
drop policy if exists "kanban comments create" on public.kanban_card_comments;
create policy "kanban comments create" on public.kanban_card_comments
  for insert to authenticated with check (public.kanban_can_edit(board_id) and author_id = auth.uid());
drop policy if exists "kanban comments edit"   on public.kanban_card_comments;
create policy "kanban comments edit" on public.kanban_card_comments
  for update to authenticated
  using (author_id = auth.uid() and public.kanban_can_edit(board_id))
  with check (author_id = auth.uid());
drop policy if exists "kanban comments delete" on public.kanban_card_comments;
create policy "kanban comments delete" on public.kanban_card_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.kanban_role(board_id) = 'owner');

-- Attachments: editors add and rename; uploader or owner removes.
drop policy if exists "kanban attachments read"   on public.kanban_card_attachments;
create policy "kanban attachments read" on public.kanban_card_attachments
  for select to authenticated using (public.kanban_can_read(board_id));
drop policy if exists "kanban attachments create" on public.kanban_card_attachments;
create policy "kanban attachments create" on public.kanban_card_attachments
  for insert to authenticated with check (public.kanban_can_edit(board_id) and uploaded_by = auth.uid());
drop policy if exists "kanban attachments edit"   on public.kanban_card_attachments;
create policy "kanban attachments edit" on public.kanban_card_attachments
  for update to authenticated
  using (public.kanban_can_edit(board_id)) with check (public.kanban_can_edit(board_id));
drop policy if exists "kanban attachments delete" on public.kanban_card_attachments;
create policy "kanban attachments delete" on public.kanban_card_attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.kanban_role(board_id) = 'owner');

-- Activity: read-only for clients (rows come from the triggers above).
drop policy if exists "kanban activity read" on public.kanban_card_activity;
create policy "kanban activity read" on public.kanban_card_activity
  for select to authenticated using (public.kanban_can_read(board_id));

-- 6. RPCs -------------------------------------------------------------------------
-- Members of a board with their profile, without opening profiles to everyone.
-- plpgsql so this file also installs before profiles.sql; names stay empty
-- until that table exists.
create or replace function public.kanban_board_people(b uuid)
returns table (user_id uuid, role text, starred boolean, full_name text, preferred_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.kanban_can_read(b) then
    return;
  end if;
  if to_regclass('public.profiles') is null then
    return query
      select m.user_id, m.role, m.starred, ''::text, ''::text, null::text
      from public.kanban_board_members m
      where m.board_id = b
      order by m.added_at;
  else
    return query execute
      'select m.user_id, m.role, m.starred, coalesce(p.full_name, ''''), coalesce(p.preferred_name, ''''), p.avatar_url
         from public.kanban_board_members m
         left join public.profiles p on p.id = m.user_id
        where m.board_id = $1
        order by m.added_at'
      using b;
  end if;
end;
$$;

-- Owner adds an existing user by email (or changes their role).
create or replace function public.kanban_add_member(b uuid, member_email text, member_role text default 'member')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if public.kanban_role(b) is distinct from 'owner' then
    raise exception 'Only a board owner can add members';
  end if;
  if member_role not in ('owner', 'member', 'viewer') then
    raise exception 'Unknown role %', member_role;
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(member_email));
  if uid is null then
    raise exception 'No account uses %', member_email;
  end if;
  insert into public.kanban_board_members (board_id, user_id, role)
  values (b, uid, member_role)
  on conflict (board_id, user_id) do update set role = excluded.role;
  return uid;
end;
$$;

-- Renumber positions 1024, 2048, ... when fractional gaps get too small.
-- Runs as the caller, so RLS still decides whether the update is allowed.
create or replace function public.kanban_rebalance_list(target_list uuid)
returns void
language sql
as $$
  update public.kanban_cards c set pos = r.n * 1024
  from (select id, row_number() over (order by pos, created_at) as n
          from public.kanban_cards where list_id = target_list) r
  where c.id = r.id;
$$;

create or replace function public.kanban_rebalance_lists(target_board uuid)
returns void
language sql
as $$
  update public.kanban_lists l set pos = r.n * 1024
  from (select id, row_number() over (order by pos, created_at) as n
          from public.kanban_lists where board_id = target_board) r
  where l.id = r.id;
$$;

-- 7. Attachment storage (private bucket, path '{board_id}/{card_id}/{file}') ------
insert into storage.buckets (id, name, public)
values ('kanban', 'kanban', false)
on conflict (id) do nothing;

drop policy if exists "kanban files read" on storage.objects;
create policy "kanban files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'kanban' and public.kanban_can_read(public.kanban_storage_board(name)));
drop policy if exists "kanban files upload" on storage.objects;
create policy "kanban files upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kanban' and public.kanban_can_edit(public.kanban_storage_board(name)));
drop policy if exists "kanban files delete" on storage.objects;
create policy "kanban files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kanban'
         and (owner = auth.uid() or public.kanban_role(public.kanban_storage_board(name)) = 'owner'));

-- 8. Realtime -------------------------------------------------------------------
-- postgres_changes honours RLS for inserts/updates; delete events carry only the
-- primary key, which the client matches against rows it already holds.
do $$
declare
  t text;
begin
  foreach t in array array['kanban_boards', 'kanban_board_members', 'kanban_lists', 'kanban_labels',
                           'kanban_cards', 'kanban_card_labels', 'kanban_card_members',
                           'kanban_checklists', 'kanban_checklist_items', 'kanban_card_comments',
                           'kanban_card_attachments', 'kanban_card_activity']
  loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
