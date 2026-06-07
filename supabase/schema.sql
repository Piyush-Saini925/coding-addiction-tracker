create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  created_at timestamptz not null default now(),
  level int not null default 1,
  total_xp int not null default 0
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  xp_earned int not null default 0,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, date)
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, date)
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  duration_minutes int not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.focus_sessions enable row level security;

drop policy if exists "profiles own select" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "daily logs own select" on public.daily_logs;
drop policy if exists "daily logs own insert" on public.daily_logs;
drop policy if exists "daily logs own update" on public.daily_logs;
drop policy if exists "daily logs own delete" on public.daily_logs;
drop policy if exists "tasks own select" on public.tasks;
drop policy if exists "tasks own insert" on public.tasks;
drop policy if exists "tasks own update" on public.tasks;
drop policy if exists "tasks own delete" on public.tasks;
drop policy if exists "task completions own select" on public.task_completions;
drop policy if exists "task completions own insert" on public.task_completions;
drop policy if exists "task completions own update" on public.task_completions;
drop policy if exists "task completions own delete" on public.task_completions;
drop policy if exists "missions readable" on public.missions;
drop policy if exists "missions own insert" on public.missions;
drop policy if exists "missions own update" on public.missions;
drop policy if exists "missions own delete" on public.missions;
drop policy if exists "mission completions own select" on public.mission_completions;
drop policy if exists "mission completions own insert" on public.mission_completions;
drop policy if exists "mission completions own update" on public.mission_completions;
drop policy if exists "mission completions own delete" on public.mission_completions;
drop policy if exists "focus sessions own select" on public.focus_sessions;
drop policy if exists "focus sessions own insert" on public.focus_sessions;
drop policy if exists "focus sessions own update" on public.focus_sessions;
drop policy if exists "focus sessions own delete" on public.focus_sessions;

create policy "profiles own select" on public.profiles for select using (id = auth.uid());
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "daily logs own select" on public.daily_logs for select using (user_id = auth.uid());
create policy "daily logs own insert" on public.daily_logs for insert with check (user_id = auth.uid());
create policy "daily logs own update" on public.daily_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily logs own delete" on public.daily_logs for delete using (user_id = auth.uid());

create policy "tasks own select" on public.tasks for select using (user_id = auth.uid());
create policy "tasks own insert" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks own update" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks own delete" on public.tasks for delete using (user_id = auth.uid());

create policy "task completions own select" on public.task_completions for select using (user_id = auth.uid());
create policy "task completions own insert" on public.task_completions for insert with check (user_id = auth.uid());
create policy "task completions own update" on public.task_completions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "task completions own delete" on public.task_completions for delete using (user_id = auth.uid());

create policy "missions readable" on public.missions for select using (user_id is null or user_id = auth.uid());
create policy "missions own insert" on public.missions for insert with check (user_id = auth.uid());
create policy "missions own update" on public.missions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "missions own delete" on public.missions for delete using (user_id = auth.uid());

create policy "mission completions own select" on public.mission_completions for select using (user_id = auth.uid());
create policy "mission completions own insert" on public.mission_completions for insert with check (user_id = auth.uid());
create policy "mission completions own update" on public.mission_completions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mission completions own delete" on public.mission_completions for delete using (user_id = auth.uid());

create policy "focus sessions own select" on public.focus_sessions for select using (user_id = auth.uid());
create policy "focus sessions own insert" on public.focus_sessions for insert with check (user_id = auth.uid());
create policy "focus sessions own update" on public.focus_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "focus sessions own delete" on public.focus_sessions for delete using (user_id = auth.uid());

insert into public.missions (user_id, title, description, is_custom)
select null, title, description, false
from (
  values
    ('Write a for loop', 'Practice loops by printing numbers, names, or project ideas.'),
    ('Build a todo app component', 'Create a small task item UI with complete and delete actions.'),
    ('Solve 1 LeetCode easy', 'Pick one easy problem and write down the pattern you used.'),
    ('Read 1 MDN doc', 'Read one short MDN page and save one useful note.'),
    ('Push code to GitHub', 'Make one small commit and push it to your repository.'),
    ('Fix one bug', 'Find one broken thing and write the fix clearly.'),
    ('Refactor one function', 'Improve naming or structure without changing behavior.'),
    ('Write a README section', 'Explain one feature, setup step, or learning clearly.')
) as seed(title, description)
where not exists (
  select 1 from public.missions existing where existing.title = seed.title and existing.user_id is null
);
