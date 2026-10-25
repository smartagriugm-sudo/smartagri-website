-- Kanban card extras (docs/kanban/card-trello-findings.md): a status field on
-- cards, watchers, and emoji reactions on comments. Run once in the Supabase
-- SQL editor after kanban.sql (and after accounts.sql if installed). Safe to
-- run again. The app hides each feature until its column or table exists.

-- 1. Status ------------------------------------------------------------------------
alter table public.kanban_cards add column if not exists status text;
alter table public.kanban_cards drop constraint if exists kanban_cards_status_check;
alter table public.kanban_cards add constraint kanban_cards_status_check
  check (status is null or status in ('todo', 'in_progress', 'review', 'blocked', 'done'));

-- Log status changes in the card's activity like other field changes.
create or replace function public.kanban_card_status_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.kanban_log(new.board_id, new.id, 'card.status_changed',
      jsonb_build_object('title', new.title, 'status', new.status, 'old_status', old.status));
  end if;
  return null;
end;
$$;

drop trigger if exists kanban_card_status_log on public.kanban_cards;
create trigger kanban_card_status_log after update of status on public.kanban_cards
  for each row execute function public.kanban_card_status_log();

-- 2. Watchers ------------------------------------------------------------------------
-- Anyone who can read a board may watch its cards; each person manages only
-- their own row.
create table if not exists public.kanban_card_watchers (
  card_id   uuid not null references public.kanban_cards (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id  uuid not null references public.kanban_boards (id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (card_id, user_id)
);
create index if not exists kanban_card_watchers_board_idx on public.kanban_card_watchers (board_id, user_id);

drop trigger if exists kanban_child_board on public.kanban_card_watchers;
create trigger kanban_child_board before insert on public.kanban_card_watchers
  for each row execute function public.kanban_child_board();

alter table public.kanban_card_watchers enable row level security;
drop policy if exists "kanban watchers read" on public.kanban_card_watchers;
create policy "kanban watchers read" on public.kanban_card_watchers
  for select to authenticated using (public.kanban_can_read(board_id));
drop policy if exists "kanban watchers add" on public.kanban_card_watchers;
create policy "kanban watchers add" on public.kanban_card_watchers
  for insert to authenticated with check (user_id = auth.uid() and public.kanban_can_read(board_id));
drop policy if exists "kanban watchers remove" on public.kanban_card_watchers;
create policy "kanban watchers remove" on public.kanban_card_watchers
  for delete to authenticated using (user_id = auth.uid());

-- 3. Comment reactions -------------------------------------------------------------------
create table if not exists public.kanban_comment_reactions (
  comment_id  uuid not null references public.kanban_card_comments (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji       text not null check (length(emoji) between 1 and 16),
  card_id     uuid not null references public.kanban_cards (id) on delete cascade,
  board_id    uuid not null references public.kanban_boards (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);
create index if not exists kanban_comment_reactions_card_idx on public.kanban_comment_reactions (card_id);

-- card_id and board_id always follow the comment.
create or replace function public.kanban_reaction_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select card_id, board_id into new.card_id, new.board_id
    from public.kanban_card_comments where id = new.comment_id;
  if new.board_id is null then
    raise exception 'Comment not found';
  end if;
  return new;
end;
$$;

drop trigger if exists kanban_reaction_parent on public.kanban_comment_reactions;
create trigger kanban_reaction_parent before insert on public.kanban_comment_reactions
  for each row execute function public.kanban_reaction_parent();

alter table public.kanban_comment_reactions enable row level security;
drop policy if exists "kanban reactions read" on public.kanban_comment_reactions;
create policy "kanban reactions read" on public.kanban_comment_reactions
  for select to authenticated using (public.kanban_can_read(board_id));
drop policy if exists "kanban reactions add" on public.kanban_comment_reactions;
create policy "kanban reactions add" on public.kanban_comment_reactions
  for insert to authenticated with check (user_id = auth.uid() and public.kanban_can_read(board_id));
drop policy if exists "kanban reactions remove" on public.kanban_comment_reactions;
create policy "kanban reactions remove" on public.kanban_comment_reactions
  for delete to authenticated using (user_id = auth.uid());

-- 4. Realtime ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['kanban_card_watchers', 'kanban_comment_reactions']
  loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
