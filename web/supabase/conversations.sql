-- Chat history for the AI Assistant. One row per conversation; the message
-- list is stored as jsonb. Run this once in the Supabase SQL editor.
--
-- Row Level Security ties every row to the signed-in user, so the browser
-- client (anon key + user session) can only read/write its own conversations.

create table if not exists public.conversations (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'New chat',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

-- A single policy covering select / insert / update / delete for the owner.
drop policy if exists "own conversations" on public.conversations;
create policy "own conversations" on public.conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
