-- Phase 2: row level security

-- Функция: является ли текущий пользователь владельцем сети
create or replace function is_owner() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$ language sql security definer;

alter table branches enable row level security;
alter table profiles enable row level security;
alter table cycles enable row level security;
alter table attestations enable row level security;
alter table ipr_items enable row level security;

-- Филиалы: читать могут все залогиненные, менять — только владелец
create policy "read branches" on branches for select using (auth.role() = 'authenticated');
create policy "owner writes branches" on branches for all using (is_owner()) with check (is_owner());

-- Профили: видеть свой профиль, владелец видит все
create policy "read own profile" on profiles for select using (id = auth.uid() or is_owner());
create policy "owner manages profiles" on profiles for all using (is_owner()) with check (is_owner());

-- Кварталы: читать могут все залогиненные, менять — только владелец
create policy "read cycles" on cycles for select using (auth.role() = 'authenticated');
create policy "owner writes cycles" on cycles for all using (is_owner()) with check (is_owner());

-- Аттестации: владелец — всё; директор — только свой филиал
create policy "owner all attestations" on attestations for all using (is_owner()) with check (is_owner());
create policy "director own branch" on attestations for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = attestations.branch_id)
);
create policy "director own branch update" on attestations for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = attestations.branch_id)
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = attestations.branch_id)
);
create policy "director own branch insert" on attestations for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = attestations.branch_id)
);

-- ИПР: те же правила
create policy "owner all ipr" on ipr_items for all using (is_owner()) with check (is_owner());
create policy "director own branch ipr" on ipr_items for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = ipr_items.branch_id)
);
create policy "director own branch ipr update" on ipr_items for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = ipr_items.branch_id)
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.branch_id = ipr_items.branch_id)
);
