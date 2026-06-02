-- ============================================
-- ROTARACT CLUB OF AIHT - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- CLUB SETTINGS (singleton)
-- ============================================
create table if not exists club_settings (
  id uuid primary key default uuid_generate_v4(),
  club_name text not null default 'Rotaract Club of AIHT',
  parent_club_name text default 'Rotary Club of Chennai',
  college_name text default 'Anand Institute of Higher Technology',
  rid text default '3233',
  current_rotaract_year text not null default '2025-2026',
  year_start_date date,
  year_end_date date,
  club_logo text,
  club_logo_id text,
  rotaract_logo text,
  rotaract_logo_id text,
  parent_club_logo text,
  parent_club_logo_id text,
  college_logo text,
  college_logo_id text,
  theme_of_year text,
  primary_color text default '#0066cc',
  secondary_color text default '#ff9800',
  about_rotaract text,
  mission_statement text,
  vision_statement text,
  club_history text,
  about_club_description text,
  home_hero_title text,
  home_hero_subtitle text,
  home_hero_description text,
  contact_description text,
  contact_email text,
  contact_phone text,
  address text,
  meeting_schedule text,
  google_map_url text default 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.3863225309346!2d80.22595567538026!3d12.818294318220223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525a64a9d9fdbd%3A0xfe20d2c9e0df4861!2sAnand%20Institute%20of%20Higher%20Technology!5e0!3m2!1sen!2sin!4v1775803619602!5m2!1sen!2sin',
  stats_active_members text default '50+',
  stats_events_this_year text default '25+',
  stats_service_hours text default '1000+',
  stats_years_of_service text default '10+',
  legacy_projects_completed text default '200+',
  legacy_alumni_members text default '500+',
  legacy_lives_impacted text default '50K+',
  established_year text default '2015',
  join_community_text text default 'Be part of a global network of young leaders making a difference.',
  achievements jsonb default '[]',
  areas_of_focus jsonb default '[]',
  social_media jsonb default '{}',
  features jsonb default '{"enableTwoFactor": false, "enableEmailNotifications": true, "enablePublicGallery": true, "maintenanceMode": false}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default settings row
insert into club_settings (id) values (uuid_generate_v4()) on conflict do nothing;

-- ============================================
-- USER PROFILES (extends Supabase Auth)
-- ============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id text unique not null,
  first_name text not null,
  last_name text not null,
  phone text,
  photo text,
  photo_id text,
  date_of_birth date,
  address jsonb default '{"street": "", "city": "", "state": "", "pincode": ""}',
  college_name text,
  course_name text,
  role text not null default 'member' check (role in (
    'member','director','associate_director','sergeant_at_arms',
    'associate_sergeant_at_arms','club_photographer','public_relation_officer_pro',
    'club_editor','content_writer','blood_donation_chairman','green_rotaractor',
    'vice_president','joint_secretary','secretary','treasurer','president',
    'faculty_coordinator','alumni'
  )),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  is_alumni boolean not null default false,
  rotaract_year text not null default '2025-2026',
  join_date timestamptz default now(),
  designation text,
  two_factor_enabled boolean default false,
  has_changed_password boolean default false,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- EVENTS
-- ============================================
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  category text not null check (category in (
    'community_service','professional_development','international_service',
    'club_service','fundraising','social','installation','other'
  )),
  tags text[] default '{}',
  estimated_budget numeric default 0,
  actual_spending numeric default 0,
  venue jsonb default '{"name": "", "address": "", "city": ""}',
  cover_image text,
  cover_image_id text,
  gallery jsonb default '[]',
  video_links text[] default '{}',
  report_link text,
  attendees integer default 0,
  status text default 'upcoming' check (status in ('upcoming','ongoing','completed','cancelled')),
  coordinator uuid references profiles(id) on delete set null,
  volunteers uuid[] default '{}',
  rotaract_year text not null default '2025-2026',
  created_by uuid references profiles(id) on delete set null,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- EXPENSES
-- ============================================
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  member uuid references profiles(id) on delete cascade not null,
  event uuid references events(id) on delete cascade not null,
  category text not null check (category in (
    'donation','personal_contribution','travel_expense','accommodation',
    'event_material','food_refreshments','miscellaneous'
  )),
  amount numeric not null check (amount > 0),
  date timestamptz not null default now(),
  payment_mode text not null check (payment_mode in ('upi','cash','bank_transfer','cheque')),
  description text,
  notes text,
  bill_url text,
  bill_file_id text,
  bill_original_name text,
  status text default 'pending' check (status in ('pending','approved','rejected','reimbursed','paid')),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  reimbursed_by uuid references profiles(id) on delete set null,
  reimbursed_at timestamptz,
  reimbursement_reference text,
  rotaract_year text not null default '2025-2026',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- BOARD MEMBERS
-- ============================================
create table if not exists board_members (
  id uuid primary key default uuid_generate_v4(),
  rotaract_year text not null,
  member_id uuid references profiles(id) on delete set null,
  role text not null,
  display_order integer default 0,
  photo text,
  photo_id text,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- GALLERY IMAGES
-- ============================================
create table if not exists gallery_images (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  file_id text,
  caption text,
  category text,
  event_id uuid references events(id) on delete set null,
  uploaded_by uuid references profiles(id) on delete set null,
  rotaract_year text not null default '2025-2026',
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- ARCHIVES
-- ============================================
create table if not exists archives (
  id uuid primary key default uuid_generate_v4(),
  rotaract_year text unique not null,
  summary jsonb default '{}',
  files jsonb default '[]',
  is_closed boolean default false,
  closed_at timestamptz,
  closed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  resource text not null,
  resource_id text,
  details jsonb default '{}',
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================
-- CONTACT MESSAGES
-- ============================================
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  is_read boolean default false,
  reply text,
  replied_at timestamptz,
  replied_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_is_active on profiles(is_active);
create index if not exists idx_profiles_rotaract_year on profiles(rotaract_year);
create index if not exists idx_events_status on events(status);
create index if not exists idx_events_start_date on events(start_date desc);
create index if not exists idx_events_rotaract_year on events(rotaract_year);
create index if not exists idx_expenses_member on expenses(member);
create index if not exists idx_expenses_status on expenses(status);
create index if not exists idx_expenses_rotaract_year on expenses(rotaract_year);
create index if not exists idx_gallery_category on gallery_images(category);
create index if not exists idx_board_year on board_members(rotaract_year);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
create or replace function is_admin_user()
returns boolean as $$
  select coalesce((
    select is_admin from profiles
    where id = auth.uid() and is_active = true
    limit 1
  ), false)
$$ language sql security definer stable;

create or replace function is_treasurer_or_admin()
returns boolean as $$
  select coalesce((
    select (is_admin = true or role in ('treasurer','secretary','joint_secretary','president'))
    from profiles
    where id = auth.uid() and is_active = true
    limit 1
  ), false)
$$ language sql security definer stable;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table events enable row level security;
alter table expenses enable row level security;
alter table board_members enable row level security;
alter table gallery_images enable row level security;
alter table archives enable row level security;
alter table audit_logs enable row level security;
alter table contact_messages enable row level security;
alter table club_settings enable row level security;

-- PROFILES
create policy "Authenticated users can view all profiles"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can insert profiles"
  on profiles for insert with check (is_admin_user());

create policy "Admins can delete profiles"
  on profiles for delete using (is_admin_user());

create policy "Admins can update any profile"
  on profiles for update using (is_admin_user());

-- EVENTS
create policy "Events viewable by everyone"
  on events for select using (true);

create policy "Admins can insert events"
  on events for insert with check (is_admin_user());

create policy "Admins can update events"
  on events for update using (is_admin_user());

create policy "Admins can delete events"
  on events for delete using (is_admin_user());

-- EXPENSES
create policy "Members see own expenses, treasurers see all"
  on expenses for select
  using (member = auth.uid() or is_treasurer_or_admin());

create policy "Members can submit expenses"
  on expenses for insert with check (member = auth.uid());

create policy "Members can update own pending expenses"
  on expenses for update
  using (member = auth.uid() and status = 'pending');

create policy "Treasurers and admins can update any expense"
  on expenses for update using (is_treasurer_or_admin());

create policy "Members can delete own pending expenses"
  on expenses for delete
  using (member = auth.uid() and status = 'pending');

create policy "Admins can delete any expense"
  on expenses for delete using (is_admin_user());

-- BOARD MEMBERS
create policy "Board viewable by everyone"
  on board_members for select using (true);

create policy "Admins can manage board"
  on board_members for all using (is_admin_user());

-- GALLERY
create policy "Gallery viewable by everyone"
  on gallery_images for select using (true);

create policy "Admins can manage gallery"
  on gallery_images for all using (is_admin_user());

-- ARCHIVES
create policy "Authenticated users can view archives"
  on archives for select using (auth.role() = 'authenticated');

create policy "Admins can manage archives"
  on archives for all using (is_admin_user());

-- AUDIT LOGS
create policy "Admins can view audit logs"
  on audit_logs for select using (is_admin_user());

create policy "Anyone authenticated can insert audit logs"
  on audit_logs for insert with check (auth.role() = 'authenticated');

-- CONTACT MESSAGES
create policy "Anyone can send a contact message"
  on contact_messages for insert with check (true);

create policy "Admins can manage contact messages"
  on contact_messages for all using (is_admin_user());

-- CLUB SETTINGS
create policy "Club settings viewable by everyone"
  on club_settings for select using (true);

create policy "Admins can update club settings"
  on club_settings for update using (is_admin_user());

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger update_events_updated_at before update on events
  for each row execute function update_updated_at();
create trigger update_expenses_updated_at before update on expenses
  for each row execute function update_updated_at();
create trigger update_board_updated_at before update on board_members
  for each row execute function update_updated_at();
create trigger update_archives_updated_at before update on archives
  for each row execute function update_updated_at();
create trigger update_settings_updated_at before update on club_settings
  for each row execute function update_updated_at();

-- ============================================
-- STORAGE BUCKETS (run after schema)
-- Run these separately if they fail here:
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
-- insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true);
-- ============================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true) on conflict do nothing;

-- Storage policies
create policy "Public photos readable by all"
  on storage.objects for select using (bucket_id = 'photos');
create policy "Authenticated can upload photos"
  on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Authenticated can delete own photos"
  on storage.objects for delete using (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Public logos readable by all"
  on storage.objects for select using (bucket_id = 'logos');
create policy "Admins can manage logos"
  on storage.objects for all using (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Public profiles readable by all"
  on storage.objects for select using (bucket_id = 'profiles');
create policy "Users can upload own profile photo"
  on storage.objects for insert with check (bucket_id = 'profiles' and auth.role() = 'authenticated');
create policy "Users can delete own profile photo"
  on storage.objects for delete using (bucket_id = 'profiles' and auth.role() = 'authenticated');

create policy "Authenticated can view own documents"
  on storage.objects for select using (
    bucket_id = 'documents' and auth.role() = 'authenticated'
  );
create policy "Authenticated can upload documents"
  on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Authenticated can delete own documents"
  on storage.objects for delete using (bucket_id = 'documents' and auth.role() = 'authenticated');
