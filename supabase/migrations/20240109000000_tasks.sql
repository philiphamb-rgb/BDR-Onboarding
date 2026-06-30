-- Task manager (Microsoft To Do parity): lists, tasks, subtasks (parent_id),
-- due dates, reminders, priority flag, completion, ordering — plus scheduling
-- fields (scheduled_day + scheduled_block) to assign a task into a Time Blocking slot.

create table if not exists public.task_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_task_lists_user on public.task_lists (user_id);
alter table public.task_lists enable row level security;
drop policy if exists tasklists_all on public.task_lists;
create policy tasklists_all on public.task_lists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  list_id         uuid references public.task_lists(id) on delete cascade,
  parent_id       uuid references public.tasks(id) on delete cascade,
  title           text not null,
  notes           text,
  done            boolean not null default false,
  priority        boolean not null default false,
  due_date        date,
  remind_at       timestamptz,
  scheduled_day   date,
  scheduled_block text,
  order_index     int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_tasks_list on public.tasks (list_id);
create index if not exists idx_tasks_sched on public.tasks (user_id, scheduled_day);
alter table public.tasks enable row level security;
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
