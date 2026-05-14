'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/clicksend'

export async function overrideAndReply(conversationId: string, message: string) {
  const supabase = await createClient()

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, customer_phone, business_id')
    .eq('id', conversationId)
    .single()

  if (!conv) throw new Error('Conversation not found')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, clicksend_number')
    .eq('id', conv.business_id)
    .single()

  if (!business?.clicksend_number) throw new Error('ClickSend number not configured')

  await sendSms({
    to: conv.customer_phone,
    from: business.clicksend_number,
    body: message,
  })

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    business_id: business.id,
    direction: 'outbound',
    body: message,
    agent_type: null, // null = sent by business owner
  })

  await supabase
    .from('conversations')
    .update({ is_overridden: true, last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath(`/conversations/${conversationId}`)
}

export async function handBackToAgent(conversationId: string) {
  const supabase = await createClient()

  await supabase
    .from('conversations')
    .update({ is_overridden: false })
    .eq('id', conversationId)

  revalidatePath(`/conversations/${conversationId}`)
}
