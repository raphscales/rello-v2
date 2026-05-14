import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { orchestrate } from '@/lib/agents/orchestrator'
import type { InboundEvent } from '@/lib/types'

// ClickSend inbound SMS webhook
// Docs: https://developers.clicksend.com/docs/rest/v3/#inbound-sms-webhook
// Auth: ClickSend doesn't sign requests — validate a shared secret in the URL query param.
// Set CLICKSEND_WEBHOOK_SECRET in env and append ?secret=<value> to the webhook URL in ClickSend dashboard.
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const expectedSecret = process.env.CLICKSEND_WEBHOOK_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const fromPhone: string = body.from
  const messageBody: string = body.body
  const toNumber: string = body.to  // our ClickSend number

  if (!fromPhone || !messageBody || !toNumber) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up business by ClickSend number
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('clicksend_number', toNumber)
    .single()

  if (!business) {
    console.error(`No business found for ClickSend number: ${toNumber}`)
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Store the inbound event
  const { data: event } = await supabase
    .from('inbound_events')
    .insert({
      business_id: business.id,
      type: 'sms',
      from_phone: fromPhone,
      body: messageBody,
      raw_payload: body,
      processed: false,
    })
    .select()
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
  }

  // Run orchestrator (async — don't block the webhook response)
  orchestrate(event as InboundEvent, business).catch(err =>
    console.error('Orchestrator error:', err)
  )

  return NextResponse.json({ received: true })
}
