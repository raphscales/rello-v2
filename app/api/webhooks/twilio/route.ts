import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { orchestrate } from '@/lib/agents/orchestrator'
import type { InboundEvent } from '@/lib/types'

// Twilio request signature validation
// https://www.twilio.com/docs/usage/security#validating-signatures-from-twilio
function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => k + params[k])
    .join('')

  const expected = crypto
    .createHmac('sha1', authToken)
    .update(url + sortedParams)
    .digest('base64')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// Twilio missed call webhook
// Twilio sends a POST when an inbound call is not answered
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const body = Object.fromEntries(formData) as Record<string, string>

  // Validate Twilio signature — requires TWILIO_AUTH_TOKEN and TWILIO_WEBHOOK_URL env vars
  // TWILIO_WEBHOOK_URL = full public URL of this route e.g. https://rello-v2-app.netlify.app/api/webhooks/twilio
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioSig = request.headers.get('x-twilio-signature')
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL

  if (authToken && twilioSig && webhookUrl) {
    if (!validateTwilioSignature(authToken, webhookUrl, body, twilioSig)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('Twilio signature validation skipped — set TWILIO_AUTH_TOKEN and TWILIO_WEBHOOK_URL')
  }

  const fromPhone = body.From as string
  const toNumber = body.To as string
  const callStatus = body.CallStatus as string

  // Only process no-answer / missed calls
  if (!['no-answer', 'busy', 'failed'].includes(callStatus)) {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()

  // Look up business by Twilio number
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_number', toNumber)
    .single()

  if (!business) {
    console.error(`No business found for Twilio number: ${toNumber}`)
    return NextResponse.json({ received: true })
  }

  // Store inbound event
  const { data: event } = await supabase
    .from('inbound_events')
    .insert({
      business_id: business.id,
      type: 'missed_call',
      from_phone: fromPhone,
      body: null,
      raw_payload: body,
      processed: false,
    })
    .select()
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
  }

  // Trigger orchestrator — will route to follow_up agent
  orchestrate(event as InboundEvent, business).catch(err =>
    console.error('Orchestrator error:', err)
  )

  // Twilio expects TwiML response — empty OK is fine for status callbacks
  return new NextResponse('<Response/>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}
