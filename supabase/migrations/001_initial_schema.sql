-- Rello v2 — Initial Schema
-- Run this in the Supabase SQL editor for the rello-v2 project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── businesses ──────────────────────────────────────────────────────────────
create table businesses (
  id                        uuid primary key default uuid_generate_v4(),
  owner_id                  uuid not null references auth.users(id) on delete cascade,
  name                      text not null,
  phone                     text not null,
  address                   text,
  timezone                  text not null default 'Pacific/Auckland',
  trading_hours             jsonb not null default '{}',
  booking_buffer_minutes    int  not null default 15,
  cancellation_cutoff_hours int  not null default 2,
  clicksend_number          text unique,
  twilio_number             text unique,
  google_calendar_token     jsonb,
  notification_email        text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table businesses enable row level security;

create policy "owners can manage their business"
  on businesses for all
  using (auth.uid() = owner_id);

-- ─── agents ──────────────────────────────────────────────────────────────────
create type agent_type as enum ('follow_up', 'booking', 'rescheduling');

create table agents (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid not null references businesses(id) on delete cascade,
  type          agent_type not null,
  name          text not null,
  brief         text not null default '',
  is_active     boolean not null default true,
  working_hours jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(business_id, type)
);

alter table agents enable row level security;

create policy "owners can manage their agents"
  on agents for all
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─── conversations ────────────────────────────────────────────────────────────
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references businesses(id) on delete cascade,
  customer_phone  text not null,
  customer_name   text,
  last_message_at timestamptz not null default now(),
  agent_type      agent_type,
  is_overridden   boolean not null default false,
  no_show_count   int not null default 0,
  created_at      timestamptz not null default now(),
  unique(business_id, customer_phone)
);

alter table conversations enable row level security;

create policy "owners can view their conversations"
  on conversations for all
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─── messages ────────────────────────────────────────────────────────────────
create type message_direction as enum ('inbound', 'outbound');

create table messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  business_id      uuid not null references businesses(id) on delete cascade,
  direction        message_direction not null,
  body             text not null,
  agent_type       agent_type,
  sent_at          timestamptz not null default now()
);

alter table messages enable row level security;

create policy "owners can view their messages"
  on messages for all
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─── bookings ────────────────────────────────────────────────────────────────
create type booking_status as enum ('pending', 'confirmed', 'rescheduled', 'cancelled', 'no_show');

create table bookings (
  id                      uuid primary key default uuid_generate_v4(),
  business_id             uuid not null references businesses(id) on delete cascade,
  conversation_id         uuid references conversations(id),
  customer_phone          text not null,
  customer_name           text,
  service                 text,
  scheduled_at            timestamptz not null,
  duration_minutes        int not null default 60,
  status                  booking_status not null default 'pending',
  google_calendar_event_id text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "owners can manage their bookings"
  on bookings for all
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- ─── inbound_events ──────────────────────────────────────────────────────────
create type event_type as enum ('sms', 'missed_call');

create table inbound_events (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  type         event_type not null,
  from_phone   text not null,
  body         text,
  raw_payload  jsonb not null default '{}',
  processed    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- No RLS on inbound_events — service role only (webhook handlers)
-- Business owners don't need direct access to raw events

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_conversations_business_phone on conversations(business_id, customer_phone);
create index idx_messages_conversation on messages(conversation_id, sent_at desc);
create index idx_bookings_business_scheduled on bookings(business_id, scheduled_at);
create index idx_inbound_events_business on inbound_events(business_id, created_at desc);

-- ─── Seed: default agents for new businesses ─────────────────────────────────
-- Call this function after creating a business to seed default agents
create or replace function seed_default_agents(p_business_id uuid)
returns void language plpgsql as $$
begin
  insert into agents (business_id, type, name, brief) values
    (p_business_id, 'follow_up',    'Follow-up Agent',    'You are a friendly follow-up agent. When someone misses a call, reach out within 60 seconds. Be warm, brief, and professional. Let them know you can help them book an appointment.'),
    (p_business_id, 'booking',      'Booking Agent',       'You are a booking agent. Help customers find and confirm a suitable appointment time. Always verify availability before confirming. Be concise and helpful.'),
    (p_business_id, 'rescheduling', 'Rescheduling Agent',  'You are a rescheduling agent. Help customers change or cancel their existing appointments. Be understanding and offer alternatives when possible.');
end;
$$;
