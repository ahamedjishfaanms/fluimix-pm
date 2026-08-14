-- =========================================================
-- Fluimix PM — migration: notifications + @mentions
-- Run this in Supabase Dashboard → SQL Editor, AFTER schema.sql
-- =========================================================

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, -- recipient
  type text not null check (type in ('assigned', 'mentioned')),
  task_id uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  title text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  using (auth.uid() = user_id);

-- Client never inserts notifications directly — only the triggers below do
-- (they run as security definer, so no insert policy is needed for users).

-- ---------- Comment mentions ----------
create table if not exists public.comment_mentions (
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_mentions enable row level security;

drop policy if exists "mentions_select_all" on public.comment_mentions;
create policy "mentions_select_all" on public.comment_mentions for select
  using (auth.role() = 'authenticated');

drop policy if exists "mentions_insert_own_comment" on public.comment_mentions;
create policy "mentions_insert_own_comment" on public.comment_mentions for insert
  with check (
    exists (
      select 1 from public.task_comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );

-- =========================================================
-- Trigger: notify when a task is assigned to someone
-- =========================================================
create or replace function public.notify_task_assignment()
returns trigger as $$
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and new.assignee_id <> coalesce(new.reporter_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications (user_id, type, task_id, project_id, actor_id, title)
    values (new.assignee_id, 'assigned', new.id, new.project_id, new.reporter_id, new.title);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_assignment on public.tasks;
create trigger trg_notify_assignment
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assignment();

-- =========================================================
-- Trigger: notify when someone is @mentioned in a comment
-- =========================================================
create or replace function public.notify_comment_mention()
returns trigger as $$
declare
  v_task_title text;
  v_project_id uuid;
  v_author_id uuid;
begin
  select t.title, t.project_id, c.author_id
    into v_task_title, v_project_id, v_author_id
  from public.task_comments c
  join public.tasks t on t.id = c.task_id
  where c.id = new.comment_id;

  if new.user_id <> v_author_id then
    insert into public.notifications (user_id, type, task_id, project_id, actor_id, title)
    select new.user_id, 'mentioned', c.task_id, v_project_id, v_author_id, v_task_title
    from public.task_comments c where c.id = new.comment_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_mention on public.comment_mentions;
create trigger trg_notify_mention
  after insert on public.comment_mentions
  for each row execute function public.notify_comment_mention();

-- ---------- Realtime for live notification updates ----------
alter publication supabase_realtime add table public.notifications;
