-- Migration v4: 4-Tier Permission System (admin > editor > user > viewer)
-- Adds the "user" role, created_by ownership on relationship edges (rule 5.1),
-- and defaults new self-signups to "user".

-- 1) Add 'user' to the profiles.role check constraint (drop + recreate).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role = any (array['admin'::text, 'editor'::text, 'user'::text, 'viewer'::text])
);

-- 2) Track who created each relationship edge (rule 5.1 edge guard).
alter table public.unions add column if not exists created_by uuid;
alter table public.parent_edges add column if not exists created_by uuid;

create index if not exists idx_unions_created_by on public.unions(created_by);
create index if not exists idx_parent_edges_created_by on public.parent_edges(created_by);

-- 3) Backfill existing edges to the first admin (treat historical edges as
--    admin-created so rule 5.1 passes for existing circles; admins/editors
--    bypass the guard anyway).
update public.unions
   set created_by = (select id from public.profiles where role = 'admin' order by created_at limit 1)
 where created_by is null;
update public.parent_edges
   set created_by = (select id from public.profiles where role = 'admin' order by created_at limit 1)
 where created_by is null;

-- 4) New self-signups default to role 'user' (spec §7). Existing accounts keep
--    their current roles. Approval stays auto-approved (unchanged behaviour).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'user',
    true
  );
  return new;
end;
$$;
