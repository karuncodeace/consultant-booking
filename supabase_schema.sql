-- Create profiles table to store user roles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('admin', 'consultant', 'sales')) default 'sales',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Create requests table
create table requests (
  id uuid default uuid_generate_v4() primary key,
  created_by uuid references profiles(id) not null,
  consultant_id uuid references profiles(id), -- Optional initially, or selected
  client_name text not null,
  requested_date date not null,
  requested_time time not null,
  status text check (status in ('pending', 'approved', 'rejected', 'rescheduled')) default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on requests
alter table requests enable row level security;

-- POLICIES

-- Profiles:
-- Public can read profiles (needed for listing consultants) - or restrict to authenticated
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

-- Users can insert their own profile (usually handled by trigger, but for safety)
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- Requests:
-- Sales: Can create requests, view their own requests.
create policy "Sales can create requests" on requests
  for insert with check (auth.uid() = created_by);

create policy "Sales can view own requests" on requests
  for select using (auth.uid() = created_by);

-- Consultant: Can view requests assigned to them (or all if we want them to pick). 
-- Let's say they can view requests where they are the consultant_id.
create policy "Consultants can view assigned requests" on requests
  for select using (auth.uid() = consultant_id);

-- Admin: Can view all requests.
-- We need a way to check role in policy.
-- A common pattern is to use a function or just check the profiles table.
-- For simplicity, let's allow "admin" role to see everything.
create policy "Admins can view all requests" on requests
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Updates:
-- Consultant can update status of their requests
create policy "Consultants can update assigned requests" on requests
  for update using (auth.uid() = consultant_id);

-- Admin can update anything
create policy "Admins can update all requests" on requests
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Trigger to handle new user signup (automatically create profile)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'sales'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create notifications table
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references profiles(id) not null,
  message text not null,
  type text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on notifications
alter table notifications enable row level security;

-- Notifications policies
-- Users can view their own notifications
create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = recipient_id);

-- Users can insert notifications (for system notifications)
-- In practice, only consultants/admins should insert, but we'll allow authenticated users
create policy "Authenticated users can insert notifications" on notifications
  for insert with check (true);

-- Users can update their own notifications (to mark as read)
create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = recipient_id);

-- Users can delete their own notifications
create policy "Users can delete own notifications" on notifications
  for delete using (auth.uid() = recipient_id);

-- ============================================
-- ENABLE REALTIME REPLICATION (REQUIRED)
-- ============================================
-- 
-- The notifications table needs realtime replication enabled for instant notifications to work.
-- 
-- OPTION 1: Via Supabase Dashboard (Easiest)
-- 1. Go to: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Navigate to: Database → Replication
-- 4. Find 'notifications' table and toggle it ON
--
-- OPTION 2: Via SQL Editor
-- Run this command in Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
--
-- VERIFY: After enabling, you can verify with:
-- SELECT * FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
--
-- NOTE: Free plan supports realtime replication - no upgrade needed!