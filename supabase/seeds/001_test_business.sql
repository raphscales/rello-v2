-- ─── Rello v2 — Raphael's test business ──────────────────────────────────────
-- Run this ONCE in the Supabase SQL editor (rello-v2 project) after the schema migration.
-- This creates your personal test business + 3 pre-seeded agents.
--
-- Before running:
--   1. Replace RAPHAEL_USER_ID with your Supabase auth user id
--      (find it: Authentication → Users → copy UUID)
--   2. Replace the email and phone with your real ones
--   3. Optionally set clicksend_number once you have a ClickSend virtual number

do $$
declare
  v_user_id    uuid := 'a63af09a-28b1-4a22-bb68-13bc74749d0f'::uuid;  -- ← replace this
  v_business_id uuid;
begin

  insert into businesses (
    owner_id,
    name,
    phone,
    address,
    timezone,
    notification_email,
    booking_buffer_minutes,
    cancellation_cutoff_hours,
    trading_hours
  ) values (
    v_user_id,
    'Rello Test Business',
    '+64 21 000 0000',             -- ← your phone (for display only)
    'Auckland, New Zealand',
    'Pacific/Auckland',
    'raphael@example.com',         -- ← your email for agent escalation alerts
    15,
    2,
    '{
      "monday":    {"open": "08:00", "close": "17:00"},
      "tuesday":   {"open": "08:00", "close": "17:00"},
      "wednesday": {"open": "08:00", "close": "17:00"},
      "thursday":  {"open": "08:00", "close": "17:00"},
      "friday":    {"open": "08:00", "close": "17:00"},
      "saturday":  null,
      "sunday":    null
    }'::jsonb
  )
  returning id into v_business_id;

  -- Seed the 3 default agents with NZ-appropriate briefs
  insert into agents (business_id, type, name, brief) values
    (
      v_business_id,
      'follow_up',
      'Follow-up Agent',
      'You are the friendly follow-up agent for Rello Test Business. When someone misses a call, text them within 60 seconds. Keep it brief and warm — something like "Hey, sorry we missed your call! We can help you get booked in. What were you after?" Never mention you are an AI. Speak plainly, like a real person from a NZ local business would.'
    ),
    (
      v_business_id,
      'booking',
      'Booking Agent',
      'You are the booking agent for Rello Test Business. Help customers find and confirm an appointment time. Always verify a time slot is available before confirming. Ask for: their name, what service they need, and a preferred time. Be concise — this is SMS, not email. Confirm with the exact time once booked.'
    ),
    (
      v_business_id,
      'rescheduling',
      'Rescheduling Agent',
      'You are the rescheduling agent for Rello Test Business. Help customers change or cancel their existing appointments. Be understanding and always offer an alternative time when someone cancels. If they cancel within 2 hours of their appointment, let them know the cancellation policy politely.'
    );

  raise notice 'Test business created: %', v_business_id;

end $$;

-- ─── Next steps after running this ───────────────────────────────────────────
-- 1. Log in at /login with your Supabase user credentials
-- 2. Go to /settings and fill in your real business details
-- 3. Add your ClickSend virtual number in Settings once you have one
-- 4. Connect Google Calendar via /settings → Google Calendar section (once built)
-- 5. When onboarding a real client: run this script again with their user_id + details,
--    OR use the /admin panel to create their business account
