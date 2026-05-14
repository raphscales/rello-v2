import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import type {
  Business, InboundEvent, Conversation, Agent, Message,
  OrchestratorDecision, BookingAction,
} from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface BookingInput {
  event: InboundEvent
  business: Business
  agents: Agent[]
  conversation: Conversation
  recentMessages: Message[]
  decision: OrchestratorDecision
}

interface AgentJsonResponse {
  reply: string
  bookingAction?: BookingAction
  escalate: boolean
  escalationReason?: string
}

export async function runBookingAgent({
  event,
  business,
  agents,
  conversation,
  recentMessages,
  decision,
}: BookingInput): Promise<string | null> {
  const agent = agents.find(a => a.type === 'booking')
  if (!agent) return null

  // Check trading hours — don't book outside business hours
  const now = new Date()
  const dayName = now.toLocaleDateString('en-NZ', {
    weekday: 'long',
    timeZone: business.timezone,
  }).toLowerCase() as keyof typeof business.trading_hours

  const todayHours = business.trading_hours?.[dayName]

  const systemPrompt = `${agent.brief}

You are the booking agent for ${business.name}.
Context: ${decision.context}

Business details:
- Name: ${business.name}
- Timezone: ${business.timezone}
- Buffer between appointments: ${business.booking_buffer_minutes} minutes
- Cancellation cutoff: ${business.cancellation_cutoff_hours} hours notice required
- Today's hours: ${todayHours ? `${todayHours.open}–${todayHours.close}` : 'Closed today'}

Rules:
- NEVER confirm a specific time without first checking availability
- Keep replies short and conversational — 1-3 sentences
- Ask for preferred day/time, then confirm you will check
- If customer asks for a time outside trading hours, politely offer an alternative
- Never make up booking slots
- Respond ONLY with valid JSON:
{
  "reply": "the SMS text to send",
  "bookingAction": null | { "type": "create"|"reschedule"|"cancel"|"confirm", "scheduledAt": "ISO string UTC", "service": "string", "durationMinutes": 60 },
  "escalate": false,
  "escalationReason": null
}`

  const messages: Anthropic.MessageParam[] = recentMessages.map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.body,
  }))

  if (event.body) {
    messages.push({ role: 'user', content: event.body })
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  let parsed: AgentJsonResponse
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    return text.trim()
  }

  if (parsed.escalate) {
    return null // orchestrator will handle escalation
  }

  // If there's a booking action, persist it
  if (parsed.bookingAction?.type === 'create' && parsed.bookingAction.scheduledAt) {
    const supabase = createServiceClient()
    const { data: newBooking } = await supabase
      .from('bookings')
      .insert({
        business_id: business.id,
        conversation_id: conversation.id,
        customer_phone: event.from_phone,
        customer_name: conversation.customer_name,
        service: parsed.bookingAction.service ?? null,
        scheduled_at: parsed.bookingAction.scheduledAt,
        duration_minutes: parsed.bookingAction.durationMinutes ?? 60,
        status: 'pending',
      })
      .select()
      .single()

    // Create Google Calendar event if connected
    if (newBooking && business.google_calendar_token) {
      const { createCalendarEvent } = await import('@/lib/google-calendar')
      const eventId = await createCalendarEvent(
        business.google_calendar_token as unknown as Record<string, unknown>,
        {
          id: newBooking.id,
          customer_name: newBooking.customer_name,
          customer_phone: newBooking.customer_phone,
          service: newBooking.service,
          scheduled_at: newBooking.scheduled_at,
          duration_minutes: newBooking.duration_minutes,
          notes: newBooking.notes,
        },
        business.timezone
      )
      if (eventId) {
        await supabase
          .from('bookings')
          .update({ google_calendar_event_id: eventId })
          .eq('id', newBooking.id)
      }
    }

    // Send confirmation email to business owner
    if (business.notification_email) {
      const { sendBookingConfirmation } = await import('@/lib/email')
      await sendBookingConfirmation({
        to: business.notification_email,
        businessName: business.name,
        customerName: newBooking.customer_name,
        customerPhone: newBooking.customer_phone,
        service: newBooking.service,
        scheduledAt: newBooking.scheduled_at,
        timezone: business.timezone,
      }).catch(err => console.error('[email] confirmation error:', err))
    }
  }

  return parsed.reply ?? null
}
