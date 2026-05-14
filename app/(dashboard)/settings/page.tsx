import { createClient } from '@/lib/supabase/server'
import BusinessSettingsForm from '@/components/dashboard/BusinessSettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ searchParams }: { searchParams: { gcal?: string } }) {
  const gcalParam = searchParams.gcal ?? null
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .single()

  const gcalConnected = !!business?.google_calendar_token

  return (
    <div>
      {gcalParam === 'connected' && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          Google Calendar connected successfully.
        </div>
      )}
      {gcalParam === 'error' && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          Could not connect Google Calendar. Please try again.
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Business info and integrations</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <BusinessSettingsForm business={{
          name: business?.name ?? '',
          phone: business?.phone ?? null,
          address: business?.address ?? null,
          timezone: business?.timezone ?? 'Pacific/Auckland',
          notification_email: business?.notification_email ?? null,
          booking_buffer_minutes: business?.booking_buffer_minutes ?? 15,
          cancellation_cutoff_hours: business?.cancellation_cutoff_hours ?? 24,
          trading_hours: business?.trading_hours as Record<string, { open: string; close: string } | null> | null,
        }} />

        {/* Google Calendar */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Google Calendar</h2>
            {gcalConnected ? (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Connected</span>
            ) : (
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not connected</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            When connected, bookings are automatically created, updated, and deleted in your Google Calendar.
          </p>
          {gcalConnected ? (
            <form action="/api/google-calendar/disconnect" method="POST">
              <button type="submit" className="text-xs font-semibold text-red-600 hover:text-red-700">
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
