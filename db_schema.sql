-- Create Notifications Table
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  actor_id uuid references auth.users(id),
  type text not null, -- 'mention', 'assignment', 'access_granted'
  content text,
  entity_id uuid, -- link to item_id or board_id
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- Policy: Users can see their own notifications
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Policy: Authenticated users can create notifications
-- Note: In production, you may want to restrict this further based on board membership
create policy "Authenticated users can create notifications"
  on notifications for insert
  with check (auth.uid() IS NOT NULL);

-- Policy: Users can update their own notifications (mark read)
create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Ensure profiles are searchable (if not already)
-- create index if not exists profiles_email_idx on profiles(email);
-- create index if not exists profiles_name_idx on profiles(full_name);
