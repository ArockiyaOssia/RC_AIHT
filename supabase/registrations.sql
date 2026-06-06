-- ============================================
-- MEMBER REGISTRATION REQUESTS
-- Self-signup -> admin approval -> emailed credentials.
-- Run this in Supabase SQL Editor (after schema.sql + grants.sql).
-- ============================================

create table if not exists registration_requests (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  first_name text not null,
  last_name text default '',
  phone text,
  college_name text,
  course_name text,
  date_of_birth date,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  member_id text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create index if not exists idx_reg_status on registration_requests(status);
create index if not exists idx_reg_created on registration_requests(created_at desc);

alter table registration_requests enable row level security;

-- Public can submit a registration (server route uses service role, but allow
-- direct anon insert too in case it is ever called from the browser).
create policy "Anyone can submit a registration"
  on registration_requests for insert with check (true);

-- Only admins can read / approve / reject.
create policy "Admins can view registrations"
  on registration_requests for select using (is_admin_user());
create policy "Admins can update registrations"
  on registration_requests for update using (is_admin_user());
create policy "Admins can delete registrations"
  on registration_requests for delete using (is_admin_user());

-- Grants (auto-expose-new-tables was disabled on this project).
grant all privileges on registration_requests to anon, authenticated, service_role;
