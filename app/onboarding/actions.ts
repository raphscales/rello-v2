'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

const DEFAULT_AGENTS = [
  {
    type: 'follow_up' as const,
    name: 'Follow-up Agent',
    brief: 'You handle missed calls and initial outreach. When a customer misses a call or reaches out for the first time, you send a friendly SMS to re-engage them and understand what they need.',
  },
  {
    type: 'booking' as const,
    name: 'Booking Agent',
    brief: 'You handle appointment scheduling. Help customers find a suitable time, confirm the booking, and answer any questions about the service.',
  },
  {
    type: 'rescheduling' as const,
    name: 'Rescheduling Agent',
    brief: 'You handle appointment changes and cancellations. Be helpful and accommodating while respecting the cancellation policy.',
  },
]

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tradingHours: Record<string, { open: string; close: string } | null> = {}
  for (const day of DAYS) {
    const closed = formData.get(`hours_${day}_closed`) === 'true'
    const open = formData.get(`hours_${day}_open`) as string | null
    const close = formData.get(`hours_${day}_close`) as string | null
    tradingHours[day] = closed || !open || !close ? null : { open, close }
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      timezone: formData.get('timezone') as string,
      notification_email: user.email,
      booking_buffer_minutes: 15,
      cancellation_cutoff_hours: 24,
      trading_hours: tradingHours,
    })
    .select('id')
    .single()

  if (error || !business) return { error: error?.message ?? 'Failed to create business' }

  // Seed 3 default agents
  await supabase.from('agents').insert(
    DEFAULT_AGENTS.map(a => ({ ...a, business_id: business.id }))
  )

  redirect('/')
}
