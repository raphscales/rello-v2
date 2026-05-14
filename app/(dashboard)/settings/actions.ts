'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

export async function updateBusiness(formData: FormData) {
  const supabase = await createClient()

  const tradingHours: Record<string, { open: string; close: string } | null> = {}
  for (const day of DAYS) {
    const open = formData.get(`hours_${day}_open`) as string | null
    const close = formData.get(`hours_${day}_close`) as string | null
    const closed = formData.get(`hours_${day}_closed`) === 'true'
    tradingHours[day] = closed || !open || !close ? null : { open, close }
  }

  const { data: business } = await supabase.from('businesses').select('id').single()
  if (!business) return { error: 'No business found' }

  const { error } = await supabase
    .from('businesses')
    .update({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      timezone: formData.get('timezone') as string,
      notification_email: formData.get('notification_email') as string,
      booking_buffer_minutes: Number(formData.get('booking_buffer_minutes')),
      cancellation_cutoff_hours: Number(formData.get('cancellation_cutoff_hours')),
      trading_hours: tradingHours,
    })
    .eq('id', business.id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
