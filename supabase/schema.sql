-- Rello v2 Schema
-- Run in Supabase SQL editor

-- ─────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- Businesses
-- ─────────────────────────────────────────
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  industry text not null default 'General',
  phone text not null,
  sms_number text,
  timezone text not null default 'Pacific/Auckland',
  trading_hours jsonb not null default '{
    "monday":    {"open": "08:00", "close": "17:00", "enabled": true},
    "tuesday":   {"open": "08:00", "close": "17:00", "enabled": true},
    "wednesday": {"open": "08:00", "close": "17:00", "enabled": true},
    "thursday":  {"open": "08:00", "close": "17:00", "enabled": true},
    "friday":    {"open": "08:00", "close": "17:00", "enabled": true},
    "saturday":  {"open": "09:00", "close": "13:00", "enabled": false},
    "sunday":    {"open": "09:00", "close": "17:00", "enabled": false}
  }',
  followup_enabled boolean not null default true,
  booking_enabled boolean not null default true,
  reschedule_enabled boolean not null default true,
  followup_name text not null default 'Follow-up Agent',
  booking_name text not null default 'Booking Agent',
  reschedule_name text not null default 'Rescheduling Agent',
  followup_brief text not null default 'You are a friendly follow-up assistant. A customer just missed a call to the business. Reach out within 60 seconds, let them know we saw their call, and ask how you can help. Be warm and concise.',
  booking_brief text not null default 'You are a booking assistant. Collect the customer name, service needed, and preferred date and time. Confirm the booking clearly and thank them.',
  reschedule_brief text not null default 'You are a rescheduling assistant. The customer wants to change their existing booking. Be understanding, offer alternative times, and confirm the new appointment.',
  notify_email_escalation boolean not null default true,
  notify_email_booking boolean not null default true,
  notify_sms_escalation boolean not null default false,
  google_calendar_token text,
  google_calendar_email text,
  google_calendar_id text,
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;

create policy "owners_select" on businesses for select
  using (owner_id = auth.uid());

create policy "owners_update" on businesses for update
  using (owner_id = auth.uid());

create policy "owners_insert" on businesses for insert
  with check (owner_id = auth.uid());

-- ─────────────────────────────────────────
-- Calls
-- ─────────────────────────────────────────
create table calls (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  caller_number text not null,
  called_at timestamptz not null default now(),
  followup_sent boolean not null default false,
  followup_sent_at timestamptz
);

alter table calls enable row level security;

create policy "owners_select_calls" on calls for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─────────────────────────────────────────
-- Conversations
-- ─────────────────────────────────────────
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  call_id uuid references calls(id) on delete set null,
  customer_number text not null,
  customer_name text,
  agent_type text not null check (agent_type in ('followup', 'booking', 'rescheduling')),
  status text not null default 'active' check (status in ('active', 'escalated', 'resolved', 'manual')),
  manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "owners_select_convos" on conversations for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "owners_update_convos" on conversations for update
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- Messages
-- ─────────────────────────────────────────
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('agent', 'customer')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "owners_select_messages" on messages for select
  using (
    conversation_id in (
      select c.id from conversations c
      join businesses b on b.id = c.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  customer_name text not null,
  customer_number text not null,
  service text not null,
  scheduled_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'rescheduled')),
  calendar_event_id text,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "owners_select_bookings" on bookings for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "owners_update_bookings" on bookings for update
  using (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "owners_insert_bookings" on bookings for insert
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
create index idx_calls_business_id on calls(business_id);
create index idx_calls_called_at on calls(called_at desc);
create index idx_conversations_business_id on conversations(business_id);
create index idx_conversations_updated_at on conversations(updated_at desc);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_bookings_business_id on bookings(business_id);
create index idx_bookings_scheduled_at on bookings(scheduled_at);

-- ─────────────────────────────────────────
-- Realtime (for live activity feed)
-- ─────────────────────────────────────────
alter publication supabase_realtime add table calls;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table messages;
