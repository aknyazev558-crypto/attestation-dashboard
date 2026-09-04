-- Each staff member now gets their own scoring column in the attestation
-- sheet (was one shared "Оценка сотрудника" field) — the app needs to show
-- that column headed with the staff member's name to every viewer of a
-- branch (owner, CEO, other staff, the director being scored), not just to
-- the owner. That means any signed-in user needs to be able to read every
-- profile (for the name) and every staff_block_access row (to know which
-- department a given staff member's column belongs to) — broadening these
-- two read policies from "own row only" / "owner only" to "any signed-in
-- user". Matches this app's existing convention: RLS draws the big lines
-- (which table a role can touch at all), fine-grained restriction (who can
-- edit which specific column) is enforced in the UI, not RLS.

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() is not null);

drop policy if exists "staff reads own block access" on staff_block_access;
create policy "read staff block access" on staff_block_access for select using (auth.uid() is not null);
