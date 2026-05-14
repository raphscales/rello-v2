import { createClient } from '@/lib/supabase/server'

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

  const upcoming = (bookings ?? []).filter(b =>
    new Date(b.scheduled_at) >= new Date() && b.status !== 'cancelled'
  )
  const past = (bookings ?? []).filter(b =>
    new Date(b.scheduled_at) < new Date() || b.status === 'cancelled'
  )

  const statusColors: Record<string, string> = {
    confirmed:    'bg-green-100 text-green-700',
    pending:      'bg-yellow-100 text-yellow-700',
    rescheduled:  'bg-blue-100 text-blue-700',
    cancelled:    'bg-red-100 text-red-700',
    no_show:      'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Appointments booked by your agents</p>
      </div>

      {/* Upcoming */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Upcoming ({upcoming.length})
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {upcoming.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming bookings.</div>
          ) : upcoming.map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {b.customer_name ?? b.customer_phone}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.service ?? 'Appointment'} · {b.duration_minutes}min
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {b.status}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {new Date(b.scheduled_at).toLocaleString('en-NZ', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: business?.timezone ?? 'Pacific/Auckland',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Past */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Past ({past.length})
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {past.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No past bookings.</div>
          ) : past.map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between opacity-70">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {b.customer_name ?? b.customer_phone}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.service ?? 'Appointment'} · {b.duration_minutes}min
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {b.status}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(b.scheduled_at).toLocaleDateString('en-NZ', {
                    day: 'numeric',
                    month: 'short',
                    timeZone: business?.timezone ?? 'Pacific/Auckland',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
