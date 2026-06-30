-- OneNote-style notes for the Plan tab + categories/tags on tasks so notes can
-- auto-triage and tag the tasks they create.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Untitled note',
  blocks jsonb not null default '[]'::jsonb,   -- [{ id, text }]
  category text,
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_user on public.notes (user_id, updated_at desc);
alter table public.notes enable row level security;
drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.tasks add column if not exists tags text[] not null default '{}';
alter table public.tasks add column if not exists category text;
