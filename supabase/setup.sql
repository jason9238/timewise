-- TimeWise: per-user synced state. Run once in the Supabase SQL editor.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "Users manage their own state"
  on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins. Rows are managed only by the `admin` edge function (service role);
-- clients can merely check admin status.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

-- Any signed-in user may check whether THEY are an admin. (Full listing goes
-- through the service-role edge function, which bypasses RLS.)
create policy "Read own admin row"
  on public.admins
  for select
  using (auth.uid() = user_id);

-- Subscribable calendar feed tokens. Managed only by the `calendar` edge
-- function (service role); the token in the URL is the secret.
create table if not exists public.calendar_feeds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text unique not null,
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
-- No policies: only the service-role edge function reads/writes this table.

-- Class groups: classmates sharing assignments/notes and comparing free time.
-- All access goes through the `groups` edge function (service role), so these
-- tables intentionally have RLS on with no client policies (avoids the
-- self-referential membership-policy recursion that bites direct RLS here).
create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  owner uuid not null references auth.users (id) on delete cascade,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_group_members (
  group_id uuid not null references public.class_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.shared_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.class_groups (id) on delete cascade,
  type text not null check (type in ('assignment', 'note')),
  payload jsonb not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now()
);

alter table public.class_groups enable row level security;
alter table public.class_group_members enable row level security;
alter table public.shared_items enable row level security;
-- No policies on the three above: only the service-role `groups` function touches them.

-- ── Bootstrap the FIRST admin (run once, after signing up in the app) ──
-- Replace the email with your own account's email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
--
-- After that, promote/demote other users from the in-app Admin panel.
