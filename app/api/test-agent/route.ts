import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runFollowUpAgent } from '@/lib/agents/follow-up'
import { runBookingAgent } from '@/lib/agents/booking'
import { runReschedulingAgent } from '@/lib/agents/rescheduling'
import type { AgentType, InboundEvent, Conversation, Message } from '@/lib/types'

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
}

// Test an agent with a simulated conversation — no real SMS sent, no DB writes.
// Rate limiting is handled client-side (3/day per agent stored in localStorage).
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId, agentType, message, history } = await request.json() as {
    agentId: string
    agentType: AgentType
    message: string
    history: TestMessage[]
  }

  if (!agentId || !agentType || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Load the business + agents for this user (RLS ensures they own it)
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('business_id', business.id)

  if (!agents?.length) return NextResponse.json({ error: 'No agents found' }, { status: 404 })

  // Build mock objects so we can call the agent directly
  const mockEvent: InboundEvent = {
    id: 'test',
    business_id: business.id,
    type: 'sms',
    from_phone: '+6421000test',
    body: message,
    raw_payload: {},
    processed: false,
    created_at: new Date().toISOString(),
  }

  const mockConversation: Conversation = {
    id: 'test',
    business_id: business.id,
    customer_phone: '+6421000test',
    customer_name: 'Test Customer',
    last_message_at: new Date().toISOString(),
    agent_type: agentType,
    is_overridden: false,
    no_show_count: 0,
    created_at: new Date().toISOString(),
  }

  // Convert chat history into Message format for the agent
  const mockMessages: Message[] = history.map((m, i) => ({
    id: `test-${i}`,
    conversation_id: 'test',
    business_id: business.id,
    direction: m.role === 'user' ? 'inbound' : 'outbound',
    body: m.content,
    agent_type: m.role === 'assistant' ? agentType : null,
    sent_at: new Date(Date.now() - (history.length - i) * 60000).toISOString(),
  }))

  const mockDecision = {
    agentType,
    context: 'This is a test conversation initiated by the business owner.',
    shouldEscalate: false,
  }

  let reply: string | null = null

  try {
    switch (agentType) {
      case 'follow_up':
        reply = await runFollowUpAgent({
          event: mockEvent,
          business,
          agents,
          conversation: mockConversation,
          recentMessages: mockMessages,
          decision: mockDecision,
        })
        break
      case 'booking':
        reply = await runBookingAgent({
          event: mockEvent,
          business,
          agents,
          conversation: mockConversation,
          recentMessages: mockMessages,
          decision: mockDecision,
        })
        break
      case 'rescheduling':
        reply = await runReschedulingAgent({
          event: mockEvent,
          business,
          agents,
          conversation: mockConversation,
          recentMessages: mockMessages,
          decision: mockDecision,
        })
        break
    }
  } catch (err) {
    console.error('Test agent error:', err)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }

  return NextResponse.json({ reply })
}
