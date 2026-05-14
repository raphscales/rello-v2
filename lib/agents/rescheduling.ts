import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import type {
  Business, InboundEvent, Conversation, Agent, Message,
  OrchestratorDecision,
} from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ReschedulingInput {
  event: InboundEvent
  business: Business
  agents: Agent[]
  conversation: Conversation
  recentMessages: Message[]
  decision: OrchestratorDecision
}

export async function runReschedulingAgent({
  event,
  business,
  agents,
  conversation,
  recentMessages,
  decision,
}: ReschedulingInput): Promise<string | null> {
  const agent = agents.find(a => a.type === 'rescheduling')
  if (!agent) return null

  const supabase = createServiceClient()

  // Look up the customer's upcoming booking
  const { data: upcomingBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', business.id)
    .eq('customer_phone', event.from_phone)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single()

  const bookingContext = upcomingBooking
    ? `Customer has a booking on ${new Date(upcomingBooking.scheduled_at).toLocaleString('en-NZ', { timeZone: business.timezone })} for ${upcomingBooking.service ?? 'an appointment'}.`
    : 'No upcoming booking found for this customer.'

  const systemPrompt = `${agent.brief}

You are the rescheduling agent for ${business.name}.
Context: ${decision.context}

${bookingContext}

Cancellation policy: ${business.cancellation_cutoff_hours} hours notice required.
Timezone: ${business.timezone}

Rules:
- If cancelling within the cutoff window, politely inform them of the policy
- For reschedules, confirm the new time will be checked and updated
- Keep replies short — 1-3 sentences
- Respond ONLY with valid JSON:
{
  "reply": "the SMS text to send",
  "bookingAction": null | { "type": "reschedule"|"cancel", "scheduledAt": "new ISO UTC string if rescheduling", "bookingId": "${upcomingBooking?.id ?? ''}" },
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

  let parsed: { reply: string; bookingAction?: { type: string; bookingId?: string; scheduledAt?: string } | null; escalate: boolean }
  try {
    parsed = JSON.parse(text)
  } catch {
    return text.trim()
  }

  // Handle booking mutations
  if (parsed.bookingAction && upcomingBooking) {
    if (parsed.bookingAction.type === 'cancel') {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', upcomingBooking.id)
    } else if (parsed.bookingAction.type === 'reschedule' && parsed.bookingAction.scheduledAt) {
      await supabase
        .from('bookings')
        .update({
          status: 'rescheduled',
          scheduled_at: parsed.bookingAction.scheduledAt,
        })
        .eq('id', upcomingBooking.id)
    }
  }

  return parsed.reply ?? null
}
