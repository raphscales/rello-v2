import { createClient } from '@/lib/supabase/server'
import LiveActivityFeed from '@/components/dashboard/LiveActivityFeed'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .single()

  const businessId = business?.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [bookingsRes, messagesRes, recentMsgsRes, recentBookingsRes, recentConvsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status')
      .eq('business_id', businessId)
      .gte('created_at', today.toISOString()),
    supabase
      .from('messages')
      .select('id')
      .eq('business_id', businessId)
      .gte('sent_at', today.toISOString()),
    // Initial data for live feed
    supabase
      .from('messages')
      .select('id, body, sent_at')
      .eq('business_id', businessId)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false })
      .limit(8),
    supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, service, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('conversations')
      .select('id, customer_phone, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const todayBookings = bookingsRes.data ?? []
  const todayMessages = messagesRes.data ?? []
  const confirmedCount = todayBookings.filter(b => b.status === 'confirmed').length

  // Build initial activity feed items
  type ActivityItem = { id: string; type: 'booking' | 'message' | 'conversation'; description: string; at: string }
  const feedItems: ActivityItem[] = [
    ...(recentMsgsRes.data ?? []).map(m => ({
      id: m.id,
      type: 'message' as const,
      description: m.body.length > 70 ? `"${m.body.slice(0, 70)}…"` : `"${m.body}"`,
      at: m.sent_at,
    })),
    ...(recentBookingsRes.data ?? []).map(b => ({
      id: b.id,
      type: 'booking' as const,
      description: `${b.customer_name ?? b.customer_phone}${b.service ? ` · ${b.service}` : ''}`,
      at: b.created_at,
    })),
    ...(recentConvsRes.data ?? []).map(c => ({
      id: c.id,
      type: 'conversation' as const,
      description: c.customer_phone,
      at: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 15)

  const stats = [
    { label: 'Bookings today',   value: confirmedCount,       color: 'text-indigo-600' },
    { label: 'Messages handled', value: todayMessages.length, color: 'text-green-600'  },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your AI team activity — today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live activity feed */}
      <LiveActivityFeed businessId={businessId ?? ''} initial={feedItems} />
    </div>
  )
}
