-- RAG knowledge base for the AI Assistant. Run once in the Supabase SQL editor
-- (safe to re-run). Embeddings are 1024-dim (bge-m3).

create extension if not exists vector;

create table if not exists public.doc_chunks (
  id          bigserial primary key,
  source      text not null default 'content',  -- 'content' (site) | 'upload' (team)
  ref         text,                              -- slug/id of the source document
  title       text,
  url         text,
  uploaded_by uuid references auth.users (id) on delete set null,
  content     text not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);

-- HNSW index: works on an empty table, good recall, no training needed.
drop index if exists doc_chunks_embedding_idx;
create index doc_chunks_embedding_idx
  on public.doc_chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search. SECURITY DEFINER so the server can call it with the anon
-- key (the knowledge base is shared organisation content).
create or replace function public.match_chunks(
  query_embedding vector(1024),
  match_count int default 5
)
returns table (
  id bigint, source text, ref text, title text, url text,
  content text, similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select id, source, ref, title, url, content,
         1 - (embedding <=> query_embedding) as similarity
  from public.doc_chunks
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count
$$;

grant execute on function public.match_chunks(vector, int) to anon, authenticated;

-- RLS: anyone may read the knowledge base; only signed-in users may write.
alter table public.doc_chunks enable row level security;

drop policy if exists "read chunks" on public.doc_chunks;
create policy "read chunks" on public.doc_chunks
  for select using (true);

drop policy if exists "insert chunks" on public.doc_chunks;
create policy "insert chunks" on public.doc_chunks
  for insert to authenticated with check (true);

drop policy if exists "delete chunks" on public.doc_chunks;
create policy "delete chunks" on public.doc_chunks
  for delete to authenticated using (true);
