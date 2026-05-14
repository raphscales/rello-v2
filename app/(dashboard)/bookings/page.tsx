import { createClient } from '@/lib/supabase/server'
import BookingsView from '@/components/dashboard/BookingsView'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, timezone')
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, customer_name, customer_phone, service, scheduled_at, status, duration_minutes')
    .eq('business_id', business?.id)
    .order('scheduled_at', { ascending: true })

  return (
    <BookingsView
      bookings={bookings ?? []}
      timezone={business?.timezone ?? 'Pacific/Auckland'}
    />
  )
}
