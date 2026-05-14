import Anthropic from '@anthropic-ai/sdk'
import type { Business, InboundEvent, Conversation, Agent, Message, OrchestratorDecision } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface FollowUpInput {
  event: InboundEvent
  business: Business
  agents: Agent[]
  conversation: Conversation
  recentMessages: Message[]
  decision: OrchestratorDecision
}

export async function runFollowUpAgent({
  event,
  business,
  agents,
  recentMessages,
  decision,
}: FollowUpInput): Promise<string | null> {
  const agent = agents.find(a => a.type === 'follow_up')
  if (!agent) return null

  const systemPrompt = `${agent.brief}

You are the follow-up agent for ${business.name}.
Context: ${decision.context}

Business details:
- Name: ${business.name}
- Phone: ${business.phone}
- Timezone: ${business.timezone}

Rules:
- Keep replies short — 1-2 sentences max
- Be warm and professional
- Don't promise exact times — offer to check availability
- If they want to book, let them know the booking agent will help
- Never mention you're an AI unless directly asked
- Never make up information about the business
- Respond only with the SMS message body — no quotes, no labels`

  const messages: Anthropic.MessageParam[] = []

  // Build conversation history
  for (const msg of recentMessages) {
    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body,
    })
  }

  // Add current message (for missed calls, synthesise a prompt)
  if (event.type === 'missed_call') {
    messages.push({
      role: 'user',
      content: `(missed call from ${event.from_phone})`,
    })
  } else if (event.body) {
    messages.push({ role: 'user', content: event.body })
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 160,
    system: systemPrompt,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : null
}
