-- Rello v2 - Raphael's test business
-- Run this ONCE in the Supabase SQL editor after the schema patch.
-- Uses a plain SQL CTE (no dollar-quoting) to avoid copy-paste encoding issues.

with new_business as (
  insert into businesses (
    owner_id,
    name,
    phone,
    timezone,
    notification_email,
    booking_buffer_minutes,
    cancellation_cutoff_hours,
    trading_hours
  ) values (
    'a63af09a-28b1-4a22-bb68-13bc74749d0f',
    'Rello Test Business',
    '+64 22 544 2322',
    'Pacific/Auckland',
    'raphael.marquet13@gmail.com',
    15,
    2,
    '{"monday":{"open":"08:00","close":"17:00"},"tuesday":{"open":"08:00","close":"17:00"},"wednesday":{"open":"08:00","close":"17:00"},"thursday":{"open":"08:00","close":"17:00"},"friday":{"open":"08:00","close":"17:00"},"saturday":null,"sunday":null}'::jsonb
  )
  returning id
)
insert into agents (business_id, type, name, brief)
select
  new_business.id,
  a.type::agent_type,
  a.name,
  a.brief
from new_business, (values
  ('follow_up',    'Follow-up Agent',    'You are the friendly follow-up agent for Rello Test Business. When someone misses a call, text them within 60 seconds. Keep it brief and warm. Never mention you are an AI. Speak plainly, like a real person from a NZ local business would.'),
  ('booking',      'Booking Agent',      'You are the booking agent for Rello Test Business. Help customers find and confirm an appointment time. Always verify a time slot is available before confirming. Ask for their name, what service they need, and a preferred time. Be concise - this is SMS, not email.'),
  ('rescheduling', 'Rescheduling Agent', 'You are the rescheduling agent for Rello Test Business. Help customers change or cancel their existing appointments. Be understanding and always offer an alternative time when someone cancels.')
) as a(type, name, brief);
