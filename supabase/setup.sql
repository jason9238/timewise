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

-- ── Bootstrap the FIRST admin (run once, after signing up in the app) ──
-- Replace the email with your own account's email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
--
-- After that, promote/demote other users from the in-app Admin panel.
