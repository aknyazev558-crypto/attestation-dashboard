-- Login history: one row per successful sign-in, written by the app
-- itself right after supabase.auth.signInWithPassword() succeeds.

create table if not exists login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

create index if not exists login_events_created_at_idx on login_events (created_at desc);

alter table login_events enable row level security;

-- Anyone can log their own login; only owner/CEO can read the history.
create policy "insert own login event" on login_events for insert with check (auth.uid() = user_id);
create policy "owner reads login events" on login_events for select using (is_owner());
