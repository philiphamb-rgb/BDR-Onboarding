-- Link a task to the note it was created from, so the note can show its spawned
-- tasks (a living plan) and stay in sync.
alter table public.tasks add column if not exists source_note_id uuid references public.notes(id) on delete set null;
create index if not exists idx_tasks_source_note on public.tasks (source_note_id) where source_note_id is not null;
