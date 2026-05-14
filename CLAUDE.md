# Rello v2 — Claude Code Context

## What this is
Next.js 14 App Router + TypeScript SaaS platform. AI-powered booking and follow-up agents for NZ local businesses (HVAC, clinics, trades). Multi-tenant — every row scoped to `business_id`.

## Stack
- **Framework**: Next.js 14 App Router + TypeScript
- **Database + Auth**: Supabase (new project named `rello-v2` — separate from v1)
- **SMS**: ClickSend (NZ-native — Twilio can't do two-way NZ SMS)
- **Voice**: Twilio (missed call detection only — phone rings out, SMS within 60s)
- **AI**: Claude Sonnet (orchestrator) + Claude Haiku (leaf agents)
- **Styling**: Tailwind CSS + Inter font, clean light theme, indigo accent

## Key files
- `lib/types.ts` — all domain types (Business, Agent, Conversation, Message, Booking)
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client + service role client
- `lib/clicksend.ts` — send SMS via ClickSend
- `lib/agents/orchestrator.ts` — master agent: routes inbound events to specialists
- `lib/agents/follow-up.ts` — handles missed calls + initial outreach
- `lib/agents/booking.ts` — handles appointment scheduling
- `lib/agents/rescheduling.ts` — handles changes/cancellations
- `middleware.ts` — Supabase SSR auth, route protection, /admin guard via ADMIN_USER_ID env
- `supabase/migrations/001_initial_schema.sql` — full schema + RLS + seed function

## App structure
- `app/login/` — login page
- `app/auth/callback/` — Supabase OAuth callback
- `app/(dashboard)/` — protected dashboard (sidebar layout)
  - `page.tsx` — stats + recent conversations
  - `conversations/page.tsx` — conversation list
  - `conversations/[id]/page.tsx` — SMS thread view + Override & reply ✓
  - `conversations/[id]/actions.ts` — server actions: overrideAndReply, handBackToAgent ✓
  - `bookings/page.tsx` — upcoming + past bookings list
  - `agents/page.tsx` — agent cards with toggle + brief editor + Test agent modal ✓
  - `settings/page.tsx` — business info + Google Calendar section
- `app/admin/page.tsx` — Raphael-only panel, guarded by ADMIN_USER_ID env
- `app/api/webhooks/clicksend/` — inbound SMS webhook (URL secret validation ✓)
- `app/api/webhooks/twilio/` — missed call webhook (HMAC-SHA1 validation ✓)
- `app/api/test-agent/` — test agent endpoint (real AI, no DB writes) ✓
- `components/dashboard/Sidebar.tsx` — left sidebar nav
- `components/dashboard/AgentCard.tsx` — agent toggle + brief editor + Test modal ✓
- `components/dashboard/OverrideReplyPanel.tsx` — override/reply client component ✓

## What still needs building (pick up from here)
1. `app/api/google-calendar/connect` + `disconnect` routes (OAuth flow)
2. Google Calendar: auto-create/update/delete events when bookings change
3. Bookings calendar toggle (month grid view)
4. Resend email: booking confirmations + reminders
5. Stripe billing (Phase 6)
6. ✓ Deployed to Vercel — https://rello-v2.vercel.app

## New env vars needed (add to .env.local.example)
- `CLICKSEND_WEBHOOK_SECRET` — shared secret appended as ?secret= to ClickSend webhook URL
- `TWILIO_AUTH_TOKEN` — from Twilio console (for signature validation)
- `TWILIO_WEBHOOK_URL` — full public URL of /api/webhooks/twilio e.g. https://rello-v2.vercel.app/api/webhooks/twilio

## To run locally
1. Copy `.env.local.example` → `.env.local` and fill in all values
2. Create Supabase project `rello-v2`, run `supabase/migrations/001_initial_schema.sql`
3. Set `ADMIN_USER_ID` to your Supabase user id
4. `npm run dev`

## Rules
- v1 at `projects/rello/` — never touch it
- All appointment times stored in UTC, displayed in business timezone
- RLS enforced on every Supabase query — service role only in webhook handlers
- Orchestrator uses Sonnet, leaf agents use Haiku
