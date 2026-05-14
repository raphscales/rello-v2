import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OverrideReplyPanel from '@/components/dashboard/OverrideReplyPanel'
import type { Message } from '@/lib/types'

const agentLabels: Record<string, string> = {
  follow_up:    'Follow-up',
  booking:      'Booking',
  rescheduling: 'Rescheduling',
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, customer_phone, customer_name, last_message_at, agent_type, is_overridden, business_id')
    .eq('id', params.id)
    .single()

  if (!conversation) notFound()

  const [businessRes, messagesRes] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, clicksend_number, timezone')
      .eq('id', conversation.business_id)
      .single(),
    supabase
      .from('messages')
      .select('id, direction, body, agent_type, sent_at')
      .eq('conversation_id', params.id)
      .order('sent_at', { ascending: true }),
  ])

  const business = businessRes.data
  const messages = (messagesRes.data ?? []) as Message[]
  const displayName = conversation.customer_name ?? conversation.customer_phone

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link
          href="/conversations"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          ← Conversations
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
          {conversation.customer_name && (
            <p className="text-sm text-gray-400">{conversation.customer_phone}</p>
          )}
        </div>
        {conversation.is_overridden && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
            Override active — agent paused
          </span>
        )}
      </div>

      {/* Thread card */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Messages */}
        <div className="p-5 space-y-3 max-h-[520px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              No messages yet in this conversation.
            </p>
          ) : messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.direction === 'inbound'
                    ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                    : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <div
                  className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                    msg.direction === 'inbound' ? 'text-gray-400' : 'text-indigo-200'
                  }`}
                >
                  <span>
                    {new Date(msg.sent_at).toLocaleTimeString('en-NZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: business?.timezone ?? 'Pacific/Auckland',
                    })}
                  </span>
                  {msg.direction === 'outbound' && (
                    <span>
                      · {msg.agent_type ? agentLabels[msg.agent_type] ?? msg.agent_type : 'You'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply panel */}
        <OverrideReplyPanel
          conversationId={conversation.id}
          isOverridden={conversation.is_overridden}
          hasClickSend={!!business?.clicksend_number}
        />
      </div>
    </div>
  )
}
