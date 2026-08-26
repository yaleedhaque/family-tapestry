-- Migration v2: Sources table, updated RLS, profiles table, storage bucket
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/eamcenktssskftpxeykw/sql/new

-- Sources table
create table if not exists sources (
  id text primary key,
  person_id text not null references persons(id) on delete cascade,
  type text not null default 'other',
  title text not null default '',
  url text default '',
  notes text default '',
  date_added timestamptz not null default now()
);

alter table sources enable row level security;
create policy "Anyone can read sources" on sources for select using (true);
create policy "Authenticated can insert sources" on sources for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update sources" on sources for update using (auth.role() = 'authenticated');
create policy "Authenticated can delete sources" on sources for delete using (auth.role() = 'authenticated');
create index if not exists idx_sources_person_id on sources(person_id);

-- Profiles table (extends auth.users with app-specific data)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  approved boolean not null default false,
  avatar_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Anyone can read profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can manage all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'editor',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed: Grant the first user (yaleedhaque@gmail.com) admin + approved
-- Run this AFTER creating your account:
-- update profiles set role = 'admin', approved = true where id = (select id from auth.users where email = 'yaleedhaque@gmail.com');

-- Seed: All 12 family persons
insert into persons (id, full_name, birth_year, death_year, is_alive, birth_place, profession, bio, email, phone, address, website, lat, lng)
values
  ('p1', 'Arthur Blackwood', 1920, 1995, false, 'Edinburgh, Scotland', 'Timber Merchant', 'Patriarch of the Blackwood family. Served in the Royal Navy during WWII. Returned home to build a timber business that supported the family for three generations.', '', '', '', '', 55.9533, -3.1883),
  ('p2', 'Martha Blackwood', 1922, 2010, false, 'Glasgow, Scotland', 'Schoolteacher', 'Matriarch of the Blackwood family. A schoolteacher who raised four children while managing the household. Known for her extraordinary baking and the Sunday dinners that gathered the entire family.', '', '', '', '', 55.8642, -4.2518),
  ('p3', 'Rose Turner', 1940, null, true, 'Aberdeen, Scotland', 'Nurse', 'Arthur''s second wife. Met Arthur at a community dance in 1993. They married in 1996 and enjoyed a loving partnership until Arthur''s passing.', 'rose.turner@outlook.com', '+44 1224 555 0103', '14 Union Terrace, Aberdeen', '', 57.1499, -2.0938),
  ('p4', 'Robert Blackwood', 1948, null, true, 'Edinburgh, Scotland', 'Diplomat', 'Eldest son of Arthur and Martha. A career diplomat who served postings across Europe before returning to Edinburgh. Father of Emily and David.', 'r.blackwood@btinternet.com', '+44 131 555 0148', '22 Royal Terrace, Edinburgh', '', 55.9533, -3.1883),
  ('p5', 'Jenny Blackwood', 1950, null, true, 'Dundee, Scotland', 'Cellist & Music Teacher', 'Born Jenny McAllister in Dundee. Married Robert in 1973. A talented cellist who played with the Scottish Chamber Orchestra for twenty years before retiring to teach music.', 'jenny.blackwood@gmail.com', '+44 131 555 0150', '22 Royal Terrace, Edinburgh', '', 56.4620, -2.9707),
  ('p6', 'Thomas Blackwood', 1952, null, true, 'Edinburgh, Scotland', 'Marine Biologist', 'Second son of Arthur and Martha. A marine biologist who spent decades studying coastal ecosystems around the British Isles. Father of Sophie.', 't.blackwood@st-andrews.ac.uk', '+44 1334 555 0152', '8 North Street, St Andrews', 'https://blackwood-marine.co.uk', 55.9533, -3.1883),
  ('p7', 'Helen Clarke', 1955, null, true, 'London, England', 'Marine Illustrator', 'Thomas''s first wife. A marine illustrator who collaborated with Thomas on several published field guides. They separated amicably in 1985; Helen continued her art career in London.', 'helen.clarke@icloud.com', '+44 20 7555 0155', '31 Kensington Church Street, London', 'https://helenclarke.art', 51.5074, -0.1278),
  ('p8', 'Charles Turner', 1958, null, true, 'Aberdeen, Scotland', 'Landscape Photographer', 'Son of Arthur and Rose. Grew up in Aberdeen. Became an acclaimed landscape photographer whose work captured the Scottish Highlands. Father of Grace.', 'charles@highlandlens.co.uk', '+44 1463 555 0158', '7 Academy Street, Inverness', 'https://highlandlens.co.uk', 57.1499, -2.0938),
  ('p9', 'Emily Blackwood', 1975, null, true, 'Edinburgh, Scotland', 'Architect', 'Daughter of Robert and Jenny. An architect specializing in sustainable heritage restoration. Led the renovation of several historic buildings in Edinburgh''s Old Town.', 'emily@blackwoodheritage.com', '+44 131 555 0175', '14 George Street, Edinburgh', 'https://blackwoodheritage.com', 55.9533, -3.1883),
  ('p10', 'David Blackwood', 1978, null, true, 'Edinburgh, Scotland', 'Software Engineer', 'Son of Robert and Jenny. A software engineer who works on climate modeling systems. Lives in London with his family.', 'david.blackwood@metoffice.gov.uk', '+44 20 8555 0178', '5 The Street, Exeter', '', 55.9533, -3.1883),
  ('p11', 'Sophie Blackwood', 1980, null, true, 'Edinburgh, Scotland', 'Documentary Filmmaker', 'Daughter of Thomas and Helen. A documentary filmmaker focused on ocean conservation. Her award-winning films have been shown at festivals worldwide.', 'sophie@oceanedgefilms.com', '+44 7700 900180', 'Studio 4, Shoreditch, London', 'https://oceanedgefilms.com', 55.9533, -3.1883),
  ('p12', 'Grace Turner', 1985, null, true, 'Inverness, Scotland', 'Ceramic Artist', 'Daughter of Charles. A ceramic artist whose work draws on Scottish folk traditions. Runs a studio and gallery in the Highlands.', 'grace@highlandclay.co.uk', '+44 1463 555 0185', '3 Castle Road, Inverness', 'https://highlandclay.co.uk', 57.4778, -4.2247)
on conflict (id) do nothing;

-- Seed: Unions
insert into unions (id, partner_a, partner_b, union_type, start_year, end_year)
values
  ('u1', 'p1', 'p2', 'marriage', 1945, null),
  ('u2', 'p1', 'p3', 'marriage', 1996, null),
  ('u3', 'p4', 'p5', 'marriage', 1973, null),
  ('u4', 'p6', 'p7', 'divorced', 1978, 1985)
on conflict (id) do nothing;

-- Seed: Parent edges (using raw SQL to generate IDs)
insert into parent_edges (id, union_id, child_id, relationship_type)
values
  ('pe1', 'u1', 'p4', 'biological'),
  ('pe2', 'u1', 'p6', 'biological'),
  ('pe3', 'u2', 'p8', 'biological'),
  ('pe4', 'u3', 'p9', 'biological'),
  ('pe5', 'u3', 'p10', 'biological'),
  ('pe6', 'u4', 'p11', 'biological')
on conflict (id) do nothing;

-- Create storage bucket for portraits
insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

-- Storage RLS: anyone can read, authenticated can upload
create policy "Portrait images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'portraits');

create policy "Authenticated can upload portraits"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portraits');

create policy "Authenticated can update own portraits"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portraits' and auth.uid() is not null);

create policy "Authenticated can delete portraits"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portraits');
