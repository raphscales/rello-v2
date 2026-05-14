import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendBookingReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Called daily by Vercel Cron — sends 24h reminders to business owners
export async function GET(req: NextRequest) {
  // Validate cron secret so this can't be triggered externally
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find bookings scheduled 23–25 hours from now (24h window)
  const from = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  const to = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, businesses(name, timezone, notification_email)')
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)

  if (error) {
    console.error('[cron/reminders] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    const biz = booking.businesses as { name: string; timezone: string; notification_email: string | null } | null
    if (!biz?.notification_email) continue

    try {
      await sendBookingReminder({
        to: biz.notification_email,
        businessName: biz.name,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        service: booking.service,
        scheduledAt: booking.scheduled_at,
        timezone: biz.timezone,
      })
      sent++
    } catch (err) {
      console.error(`[cron/reminders] failed for booking ${booking.id}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
