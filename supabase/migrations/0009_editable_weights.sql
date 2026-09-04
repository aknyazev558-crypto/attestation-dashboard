-- Owner/CEO can now edit the weight of each of the 4 scoring blocks
-- (previously hardcoded 35/25/20/20 in lib/competencies.ts) and the
-- relative weight of each competency within its block (previously an
-- implicit equal-weight average across a block's competencies). Stored as
-- plain numbers, not fractions — computeResult only uses them as ratios,
-- so 35/25/20/20 or 0.35/0.25/0.20/0.20 behave identically.

create table if not exists scoring_blocks (
  id text primary key,
  name text not null,
  weight numeric not null,
  sort_order int not null
);

insert into scoring_blocks (id, name, weight, sort_order) values
  ('1', 'Бизнес-результат', 35, 1),
  ('2', 'Управление командой', 25, 2),
  ('3', 'Операционное управление', 20, 3),
  ('4', 'Личная эффективность и лидерство', 20, 4)
on conflict (id) do nothing;

alter table scoring_blocks enable row level security;

drop policy if exists "read scoring blocks" on scoring_blocks;
create policy "read scoring blocks" on scoring_blocks for select using (auth.uid() is not null);

drop policy if exists "owner manages scoring blocks" on scoring_blocks;
create policy "owner manages scoring blocks" on scoring_blocks for all
  using (is_owner()) with check (is_owner());

alter table competencies add column if not exists weight numeric not null default 1;
