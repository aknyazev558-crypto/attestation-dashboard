-- A competency can belong to more than one block of competencies (e.g. a
-- competency relevant to both "Продажи" and "КЦ") — move department
-- membership from the single competencies.department_id column into a
-- many-to-many join table.

create table if not exists competency_departments (
  competency_id text references competencies(id) on delete cascade not null,
  department_id text references departments(id) on delete cascade not null,
  primary key (competency_id, department_id)
);

insert into competency_departments (competency_id, department_id)
select id, department_id from competencies where department_id is not null
on conflict do nothing;

alter table competencies drop column if exists department_id;

alter table competency_departments enable row level security;

drop policy if exists "read competency departments" on competency_departments;
create policy "read competency departments" on competency_departments for select
  using (auth.uid() is not null);

drop policy if exists "owner manages competency departments" on competency_departments;
create policy "owner manages competency departments" on competency_departments for all
  using (is_owner()) with check (is_owner());

-- A staff member may link a competency to a department they've been
-- granted access to (mirrors the previous single-department insert check
-- from 0007, now against the join table instead of a column).
drop policy if exists "staff links competency to own department" on competency_departments;
create policy "staff links competency to own department" on competency_departments for insert
  with check (
    is_staff() and exists (
      select 1 from staff_block_access
      where user_id = auth.uid() and block_id = competency_departments.department_id
    )
  );

-- The 0007 insert policy referenced competencies.department_id, which no
-- longer exists — replace it. A staff member may still create the
-- competency row itself (name only, never with a scoring block); which
-- department(s) it belongs to is enforced by the join-table policy above.
drop policy if exists "staff adds competency in own department" on competencies;
drop policy if exists "staff adds competency" on competencies;
create policy "staff adds competency" on competencies for insert
  with check (is_staff() and block is null);
