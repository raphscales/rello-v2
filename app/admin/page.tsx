import { createServiceClient } from '@/lib/supabase/server'
import AdminPanel from './AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createServiceClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone, created_at')
    .order('created_at', { ascending: false })

  // Get booking + conversation counts per business
  const { data: bookingCounts } = await supabase
    .from('bookings')
    .select('business_id')

  const { data: convCounts } = await supabase
    .from('conversations')
    .select('business_id')

  const enriched = (businesses ?? []).map(b => ({
    ...b,
    bookingCount: bookingCounts?.filter(x => x.business_id === b.id).length ?? 0,
    conversationCount: convCounts?.filter(x => x.business_id === b.id).length ?? 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <AdminPanel businesses={enriched} />
    </div>
  )
}
