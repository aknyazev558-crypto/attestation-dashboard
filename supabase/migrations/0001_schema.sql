-- Phase 1: schema
-- Филиалы
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brands text[] default '{}'
);

-- Пользователи и их роли (привязаны к встроенной таблице auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('owner','director')),
  branch_id uuid references branches(id)
);

-- Кварталы аттестации
create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  is_current boolean default false
);

-- Аттестации
create table if not exists attestations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  cycle text not null,
  self_scores jsonb default '{}',
  manager_scores jsonb default '{}',
  achievements text,
  growth_areas text,
  discussion text,
  decision text,
  next_date date,
  updated_at timestamptz default now(),
  unique (branch_id, cycle)
);

-- Пункты ИПР
create table if not exists ipr_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  zone text, action text, deadline date, metric text, curator text,
  status text default 'Не начат',
  note text,
  created_at timestamptz default now()
);
