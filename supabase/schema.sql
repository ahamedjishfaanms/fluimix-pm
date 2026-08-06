-- =========================================================
-- Fluimix PM — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (once, top to bottom)
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type project_status as enum ('active','on_hold','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('backlog','todo','in_progress','in_review','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin','member');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  title text,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- ---------- Projects (self-referencing for sub-projects) ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null,
  description text,
  parent_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  status project_status not null default 'active',
  color text not null default '#153a67',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_parent_idx on public.projects(parent_id);

-- ---------- Project members (who is on which project) ----------
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ---------- Tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_date date,
  assignee_id uuid references public.profiles(id),
  reporter_id uuid not null references public.profiles(id),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

-- ---------- Task comments ----------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_task_idx on public.task_comments(task_id);

-- ---------- Documentation pages ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  content text not null default '',
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_project_idx on public.documents(project_id);

-- ---------- updated_at trigger helper ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- =========================================================
-- Domain-restricted signup: only @fluimix.com may register
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.email !~* '^[a-zA-Z0-9._%+-]+@fluimix\.com$' then
    raise exception 'Sign up is restricted to @fluimix.com email addresses.';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Row Level Security
-- Internal company tool: any signed-in @fluimix.com user can
-- read everything and collaborate; writes are scoped sensibly.
-- =========================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.documents enable row level security;

-- Profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id);

-- Projects
drop policy if exists "projects_select_all" on public.projects;
create policy "projects_select_all" on public.projects for select
  using (auth.role() = 'authenticated');

drop policy if exists "projects_insert_auth" on public.projects;
create policy "projects_insert_auth" on public.projects for insert
  with check (auth.uid() = owner_id);

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner" on public.projects for update
  using (auth.uid() = owner_id or auth.uid() in (
    select user_id from public.project_members where project_id = id
  ));

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner" on public.projects for delete
  using (auth.uid() = owner_id);

-- Project members
drop policy if exists "members_select_all" on public.project_members;
create policy "members_select_all" on public.project_members for select
  using (auth.role() = 'authenticated');

drop policy if exists "members_write_auth" on public.project_members;
create policy "members_write_auth" on public.project_members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Tasks
drop policy if exists "tasks_select_all" on public.tasks;
create policy "tasks_select_all" on public.tasks for select
  using (auth.role() = 'authenticated');

drop policy if exists "tasks_insert_auth" on public.tasks;
create policy "tasks_insert_auth" on public.tasks for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "tasks_update_auth" on public.tasks;
create policy "tasks_update_auth" on public.tasks for update
  using (auth.role() = 'authenticated');

drop policy if exists "tasks_delete_auth" on public.tasks;
create policy "tasks_delete_auth" on public.tasks for delete
  using (auth.uid() = reporter_id);

-- Task comments
drop policy if exists "comments_select_all" on public.task_comments;
create policy "comments_select_all" on public.task_comments for select
  using (auth.role() = 'authenticated');

drop policy if exists "comments_insert_auth" on public.task_comments;
create policy "comments_insert_auth" on public.task_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "comments_delete_own" on public.task_comments;
create policy "comments_delete_own" on public.task_comments for delete
  using (auth.uid() = author_id);

-- Documents
drop policy if exists "documents_select_all" on public.documents;
create policy "documents_select_all" on public.documents for select
  using (auth.role() = 'authenticated');

drop policy if exists "documents_insert_auth" on public.documents;
create policy "documents_insert_auth" on public.documents for insert
  with check (auth.uid() = author_id);

drop policy if exists "documents_update_auth" on public.documents;
create policy "documents_update_auth" on public.documents for update
  using (auth.role() = 'authenticated');

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents for delete
  using (auth.uid() = author_id);

-- =========================================================
-- Realtime (optional but recommended for a live board)
-- =========================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.projects;
