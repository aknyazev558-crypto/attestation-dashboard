-- "Сотрудники" (staff): a role below owner/ceo — free-text position
-- (job title), no org-management rights, and edit access scoped to
-- specific competency blocks (1..4) rather than the whole attestation.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'director', 'ceo', 'staff'));

alter table profiles add column if not exists position text;

create table if not exists staff_block_access (
  user_id uuid references profiles(id) on delete cascade not null,
  block_id text not null,
  primary key (user_id, block_id)
);

alter table staff_block_access enable row level security;

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'staff');
$$ language sql security definer;

-- Only owner/CEO configure who gets access to which block; a staff
-- member can read their own grants (so the UI knows what to unlock).
create policy "owner manages block access" on staff_block_access for all
  using (is_owner()) with check (is_owner());
create policy "staff reads own block access" on staff_block_access for select
  using (auth.uid() = user_id);

-- Director names, staff positions etc. need to be visible network-wide
-- for the dashboard and the branch card to render for a staff viewer.
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (
  id = auth.uid() or is_owner() or is_staff()
);

-- Staff can see every branch's attestation (read) and save scores (write)
-- — which competency blocks they're actually allowed to edit is enforced
-- in the UI, same convention already used for the self/manager score
-- split and the CEO-only comment field elsewhere in this schema.
create policy "staff read attestations" on attestations for select using (is_staff());
create policy "staff update attestations" on attestations for update
  using (is_staff()) with check (is_staff());
