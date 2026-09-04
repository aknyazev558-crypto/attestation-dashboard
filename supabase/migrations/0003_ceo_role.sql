-- Phase 3+: CEO role with the same (full) RLS rights as owner, plus two
-- CEO-only fields: an executive comment on attestations, and a "source"
-- tag on ИПР items so ones added by the CEO can be marked/shown as such.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'director', 'ceo'));

-- Broaden is_owner() instead of adding parallel policies everywhere:
-- every existing "owner has full access" policy (branches, profiles,
-- cycles, attestations, ipr_items) now also covers ceo automatically.
create or replace function is_owner() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'ceo'));
$$ language sql security definer;

alter table attestations add column if not exists ceo_comment text;

alter table ipr_items add column if not exists source text not null default 'owner';
alter table ipr_items drop constraint if exists ipr_items_source_check;
alter table ipr_items add constraint ipr_items_source_check
  check (source in ('owner', 'ceo'));
