-- Family Tapestry Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/eamcenktssskftpxeykw/sql/new

-- Persons table
create table if not exists persons (
  id text primary key,
  full_name text not null default '',
  birth_year integer,
  death_year integer,
  is_alive boolean not null default true,
  birth_place text,
  death_place text,
  profession text,
  bio text,
  photo_url text,
  email text,
  phone text,
  address text,
  website text,
  lat double precision,
  lng double precision,
  links jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  privacy_level text not null default 'family',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unions table
create table if not exists unions (
  id text primary key,
  partner_a text not null,
  partner_b text not null,
  union_type text not null default 'marriage',
  start_year integer,
  end_year integer
);

-- Parent edges table
create table if not exists parent_edges (
  id text primary key,
  union_id text not null,
  child_id text not null,
  relationship_type text not null default 'biological'
);

-- Descendant closure table (for tree queries)
create table if not exists descendant_closure (
  ancestor_id text not null,
  descendant_id text not null,
  depth integer not null default 0,
  primary key (ancestor_id, descendant_id)
);

-- Edit log table
create table if not exists edit_log (
  id uuid primary key default gen_random_uuid(),
  person_id text not null,
  editor_id uuid,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  edited_at timestamptz not null default now()
);

-- Family roles table
create table if not exists family_roles (
  user_id uuid primary key,
  role text not null default 'viewer',
  branch_id text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_unions_partner_a on unions(partner_a);
create index if not exists idx_unions_partner_b on unions(partner_b);
create index if not exists idx_parent_edges_union_id on parent_edges(union_id);
create index if not exists idx_parent_edges_child_id on parent_edges(child_id);
create index if not exists idx_edit_log_person_id on edit_log(person_id);
create index if not exists idx_edit_log_edited_at on edit_log(edited_at desc);

-- Enable RLS
alter table persons enable row level security;
alter table unions enable row level security;
alter table parent_edges enable row level security;
alter table edit_log enable row level security;
alter table family_roles enable row level security;

-- RLS Policies: everyone authenticated can read, only editors/admins can write
create policy "Anyone can read persons" on persons for select using (true);
create policy "Authenticated can insert persons" on persons for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update persons" on persons for update using (auth.role() = 'authenticated');
create policy "Authenticated can delete persons" on persons for delete using (auth.role() = 'authenticated');

create policy "Anyone can read unions" on unions for select using (true);
create policy "Authenticated can insert unions" on unions for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update unions" on unions for update using (auth.role() = 'authenticated');
create policy "Authenticated can delete unions" on unions for delete using (auth.role() = 'authenticated');

create policy "Anyone can read parent_edges" on parent_edges for select using (true);
create policy "Authenticated can insert parent_edges" on parent_edges for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update parent_edges" on parent_edges for update using (auth.role() = 'authenticated');
create policy "Authenticated can delete parent_edges" on parent_edges for delete using (auth.role() = 'authenticated');

create policy "Anyone can read edit_log" on edit_log for select using (true);
create policy "Authenticated can insert edit_log" on edit_log for insert with check (auth.role() = 'authenticated');

create policy "Anyone can read family_roles" on family_roles for select using (true);
create policy "Authenticated can manage family_roles" on family_roles for all using (auth.role() = 'authenticated');
