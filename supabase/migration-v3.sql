-- Migration v3: Life events, version locking, realtime

-- Life events table
create table if not exists life_events (
  id text primary key,
  person_id text not null references persons(id) on delete cascade,
  year integer not null,
  month integer,
  day integer,
  event_type text not null default 'other',
  title text not null default '',
  description text default '',
  place text default '',
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table life_events enable row level security;
create policy "Anyone can read life_events" on life_events for select using (true);
create policy "Authenticated can insert life_events" on life_events for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update life_events" on life_events for update using (auth.role() = 'authenticated');
create policy "Authenticated can delete life_events" on life_events for delete using (auth.role() = 'authenticated');
create index if not exists idx_life_events_person_id on life_events(person_id);
create index if not exists idx_life_events_year on life_events(year);

-- Version column for optimistic locking
alter table persons add column if not exists version integer default 1;

-- Enable realtime on key tables
alter publication supabase_realtime add table persons;
alter publication supabase_realtime add table unions;
alter publication supabase_realtime add table parent_edges;
alter publication supabase_realtime add table life_events;
