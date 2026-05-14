import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .single()

  const gcalConnected = !!business?.google_calendar_token

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Business info and integrations</p>
      </div>

      <div className="space-y-6 max-w-2xl">

        {/* Business info */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Business info</h2>
          <div className="space-y-4">
            <InfoRow label="Business name" value={business?.name} />
            <InfoRow label="Phone number" value={business?.phone} />
            <InfoRow label="Address" value={business?.address} />
            <InfoRow label="Timezone" value={business?.timezone} />
            <InfoRow label="Notification email" value={business?.notification_email} />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            To update these details, contact Rello.
          </p>
        </section>

        {/* Trading hours */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Trading hours</h2>
          {business?.trading_hours ? (
            <div className="space-y-2">
              {Object.entries(business.trading_hours).map(([day, hours]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-700 font-medium">{day}</span>
                  {hours ? (
                    <span className="text-gray-500">{(hours as { open: string; close: string }).open} – {(hours as { open: string; close: string }).close}</span>
                  ) : (
                    <span className="text-gray-400">Closed</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No trading hours set.</p>
          )}
        </section>

        {/* Google Calendar */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Google Calendar</h2>
            {gcalConnected ? (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Connected
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Not connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            When connected, bookings are automatically created, updated, and deleted in your Google Calendar.
          </p>
          {gcalConnected ? (
            <form action="/api/google-calendar/disconnect" method="POST">
              <button
                type="submit"
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Disconnect calendar
              </button>
            </form>
          ) : (
            <a
              href="/api/google-calendar/connect"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Connect Google Calendar
            </a>
          )}
        </section>

      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '—'}</span>
    </div>
  )
}
