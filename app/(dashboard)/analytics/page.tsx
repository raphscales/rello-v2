import { createClient } from '@/lib/supabase/server'
import AnalyticsDatePicker from '@/components/dashboard/AnalyticsDatePicker'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  confirmed:   'bg-green-50 text-green-700',
  cancelled:   'bg-red-50 text-red-700',
  rescheduled: 'bg-amber-50 text-amber-700',
  pending:     'bg-gray-100 text-gray-600',
  no_show:     'bg-orange-50 text-orange-700',
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const supabase = await createClient()
  const range = searchParams.range ?? '7d'
  const daysBack = range === 'today' ? 1 : range === '30d' ? 30 : 7

  const { data: business } = await supabase
    .from('businesses')
    .select('id, timezone')
    .single()

  if (!business) return null

  const now = new Date()
  const since = new Date(now)
  since.setDate(since.getDate() - (daysBack - 1))
  since.setHours(0, 0, 0, 0)

  const [bookingsRes, conversationsRes, messagesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, scheduled_at, customer_name, customer_phone, service, created_at')
      .eq('business_id', business.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('conversations')
      .select('id, created_at')
      .eq('business_id', business.id)
      .gte('created_at', since.toISOString()),
    supabase
      .from('messages')
      .select('id, direction')
      .eq('business_id', business.id)
      .gte('sent_at', since.toISOString()),
  ])

  const bookings = bookingsRes.data ?? []
  const conversations = conversationsRes.data ?? []
  const messages = messagesRes.data ?? []

  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const outbound = messages.filter(m => m.direction === 'outbound').length
  const conversionRate = conversations.length > 0
    ? Math.round((confirmed / conversations.length) * 100)
    : 0

  // Build daily chart data
  const days = Array.from({ length: daysBack }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (daysBack - 1 - i))
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = bookings.filter(b => {
      const at = new Date(b.created_at)
      return at >= d && at < next && b.status === 'confirmed'
    }).length
    return {
      label: d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: business.timezone }),
      key: d.toISOString(),
      count,
    }
  })

  const maxCount = Math.max(...days.map(d => d.count), 1)

  const kpis = [
    { label: 'Bookings confirmed', value: confirmed,              color: 'text-indigo-600' },
    { label: 'Conversations',      value: conversations.length,   color: 'text-blue-600'   },
    { label: 'Messages sent',      value: outbound,               color: 'text-green-600'  },
    { label: 'Conversion rate',    value: `${conversionRate}%`,   color: 'text-purple-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Your agents&apos; performance over time</p>
        </div>
        <AnalyticsDatePicker range={range} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-6">Confirmed bookings per day</h2>
        <div className="flex items-end gap-1.5 h-32">
          {days.map(d => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 h-4">{d.count > 0 ? d.count : ''}</span>
              <div
                className="w-full rounded-t bg-indigo-500 transition-all"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '2px',
                  opacity: d.count > 0 ? 1 : 0.12,
                }}
              />
              <span className="text-[10px] text-gray-400 leading-tight text-center whitespace-nowrap">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Bookings <span className="text-gray-400 font-normal ml-1">({bookings.length})</span>
          </h2>
          {bookings.length > 0 && (
            <a
              href={`/api/export/bookings?range=${range}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Export CSV ↓
            </a>
          )}
        </div>
        {bookings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No bookings in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Scheduled</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{b.customer_name ?? b.customer_phone}</div>
                      {b.customer_name && <div className="text-xs text-gray-400">{b.customer_phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{b.service ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(b.scheduled_at).toLocaleString('en-NZ', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                        timeZone: business.timezone,
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
