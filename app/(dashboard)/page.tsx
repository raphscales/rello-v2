import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .single()

  const businessId = business?.id

  // Fetch today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [bookingsRes, messagesRes, conversationsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status')
      .eq('business_id', businessId)
      .gte('scheduled_at', today.toISOString()),
    supabase
      .from('messages')
      .select('id')
      .eq('business_id', businessId)
      .gte('sent_at', today.toISOString()),
    supabase
      .from('conversations')
      .select('id, customer_phone, customer_name, last_message_at, agent_type')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false })
      .limit(5),
  ])

  const todayBookings = bookingsRes.data ?? []
  const todayMessages = messagesRes.data ?? []
  const recentConversations = conversationsRes.data ?? []

  const confirmedCount = todayBookings.filter(b => b.status === 'confirmed').length

  const stats = [
    { label: 'Bookings today',    value: confirmedCount,          color: 'text-indigo-600' },
    { label: 'Messages handled',  value: todayMessages.length,    color: 'text-green-600'  },
    { label: 'Active threads',    value: recentConversations.length, color: 'text-blue-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your AI team activity — today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent conversations</h2>
        </div>
        {recentConversations.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No conversations yet. Agents are ready when your first customer reaches out.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentConversations.map(c => (
              <li key={c.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.customer_name ?? c.customer_phone}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    via {c.agent_type?.replace('_', ' ') ?? 'agent'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(c.last_message_at).toLocaleTimeString('en-NZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
