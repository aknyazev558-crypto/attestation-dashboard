-- Department-style blocks (separate from the 4 weighted scoring blocks
-- hardcoded in lib/competencies.ts) used to organize competencies and
-- staff edit access by function: Продажи, ППО, HR, Маркетинг, КЦ, CQ,
-- FinDep. These coexist with the scoring blocks — a competency's scoring
-- block (for the weighted 35/25/20/20% total, unchanged) and its
-- department (for who may edit/add it) are independent attributes.

create table if not exists departments (
  id text primary key,
  name text not null,
  sort_order int not null
);

insert into departments (id, name, sort_order) values
  ('sales', 'Продажи', 1),
  ('ppo', 'ППО', 2),
  ('hr', 'HR', 3),
  ('marketing', 'Маркетинг', 4),
  ('kc', 'КЦ', 5),
  ('cq', 'CQ', 6),
  ('findep', 'FinDep', 7)
on conflict (id) do nothing;

alter table departments enable row level security;
drop policy if exists "read departments" on departments;
create policy "read departments" on departments for select using (auth.uid() is not null);

-- Competencies move out of the hardcoded lib/competencies.ts array into the
-- database, so owner/CEO can reassign them across departments and staff can
-- add new ones within a department they've been granted. `block` keeps the
-- existing scoring-block id ('1'..'4') — null means "not yet counted in the
-- weighted total": every competency a staff member adds starts this way,
-- until owner/CEO assign it a scoring block from the management panel.
create table if not exists competencies (
  id text primary key default gen_random_uuid()::text,
  block text,
  department_id text references departments(id) on delete set null,
  name text not null,
  is_custom boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table competencies enable row level security;

-- Everyone signed in needs the full list to render the attestation sheet
-- (director filling self-assessment, owner/CEO/staff scoring as manager).
drop policy if exists "read competencies" on competencies;
create policy "read competencies" on competencies for select using (auth.uid() is not null);

drop policy if exists "owner manages competencies" on competencies;
create policy "owner manages competencies" on competencies for all
  using (is_owner()) with check (is_owner());

-- A staff member may add a competency only within a department they've
-- been granted. From this migration on, staff_block_access.block_id holds
-- a department id from the table above — the "Сотрудники" panel switched
-- from picking scoring blocks (1..4) to picking departments, since that's
-- what staff access is actually organized by now. Any block_id rows
-- assigned before this migration (the old '1'..'4' scoring-block ids) no
-- longer match a real department and effectively grant nothing — re-check
-- staff members' access in the "Сотрудники" panel after applying this.
drop policy if exists "staff adds competency in own department" on competencies;
create policy "staff adds competency in own department" on competencies for insert
  with check (
    is_staff() and department_id is not null and exists (
      select 1 from staff_block_access
      where user_id = auth.uid() and block_id = department_id
    )
  );

insert into competencies (id, block, department_id, name, is_custom, sort_order) values
  ('c1', '1', null, 'Выполнение плана продаж', false, 1),
  ('c2', '1', null, 'Управление рентабельностью точки', false, 2),
  ('c3', '1', null, 'Управление стоком/складом автомобилей', false, 3),
  ('c4', '2', null, 'Подбор и адаптация персонала', false, 4),
  ('c5', '2', null, 'Постановка задач и контроль исполнения', false, 5),
  ('c6', '2', null, 'Развитие сотрудников, работа с низкой эффективностью', false, 6),
  ('c7', '2', null, 'Атмосфера в команде / климат', false, 7),
  ('c8', '3', null, 'Соблюдение стандартов бренда (dealer standards)', false, 8),
  ('c9', '3', null, 'Работа с CRM и отчётностью', false, 9),
  ('c10', '3', null, 'Клиентский сервис (NPS, работа с претензиями)', false, 10),
  ('c11', '4', null, 'Принятие решений и ответственность', false, 11),
  ('c12', '4', null, 'Коммуникация с головным офисом / импортёром', false, 12),
  ('c13', '4', null, 'Обучаемость и работа над собой', false, 13)
on conflict (id) do nothing;
