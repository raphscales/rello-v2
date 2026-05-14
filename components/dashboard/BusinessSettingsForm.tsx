'use client'

import { useState, useTransition } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { updateBusiness } from '@/app/(dashboard)/settings/actions'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const TIMEZONES = [
  'Pacific/Auckland','Pacific/Chatham','Australia/Sydney','Australia/Melbourne',
  'Australia/Brisbane','Australia/Perth','Australia/Adelaide',
]

type TradingHours = Record<string, { open: string; close: string } | null>

interface Business {
  name: string
  phone: string | null
  address: string | null
  timezone: string
  notification_email: string | null
  booking_buffer_minutes: number | null
  cancellation_cutoff_hours: number | null
  trading_hours: TradingHours | null
}

export default function BusinessSettingsForm({ business }: { business: Business }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Closed state per day
  const initClosed: Record<string, boolean> = {}
  for (const day of DAYS) {
    initClosed[day] = !(business.trading_hours?.[day])
  }
  const [closed, setClosed] = useState(initClosed)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    // Inject closed flags
    for (const day of DAYS) {
      fd.set(`hours_${day}_closed`, closed[day] ? 'true' : 'false')
    }
    startTransition(async () => {
      const result = await updateBusiness(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setEditing(false)
        setError(null)
      }
    })
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        {/* Business info read-only */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Business info</h2>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
          <div className="space-y-0">
            <InfoRow label="Business name" value={business.name} />
            <InfoRow label="Phone number" value={business.phone} />
            <InfoRow label="Address" value={business.address} />
            <InfoRow label="Timezone" value={business.timezone} />
            <InfoRow label="Notification email" value={business.notification_email} />
            <InfoRow label="Booking buffer" value={business.booking_buffer_minutes != null ? `${business.booking_buffer_minutes} min` : undefined} />
            <InfoRow label="Cancellation cutoff" value={business.cancellation_cutoff_hours != null ? `${business.cancellation_cutoff_hours} hrs` : undefined} />
          </div>
        </section>

        {/* Trading hours read-only */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Trading hours</h2>
          {business.trading_hours ? (
            <div className="space-y-2">
              {DAYS.map(day => {
                const hours = business.trading_hours?.[day]
                return (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-700 font-medium">{day}</span>
                    {hours ? (
                      <span className="text-gray-500">{hours.open} – {hours.close}</span>
                    ) : (
                      <span className="text-gray-400">Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No trading hours set.</p>
          )}
        </section>
      </div>
    )
  }

  // Edit mode
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}

      {/* Business info edit */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Business info</h2>
          <button type="button" onClick={() => { setEditing(false); setError(null) }} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Business name" name="name" defaultValue={business.name} required />
          <Field label="Phone number" name="phone" defaultValue={business.phone ?? ''} />
          <Field label="Address" name="address" defaultValue={business.address ?? ''} />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
            <select name="timezone" defaultValue={business.timezone}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Field label="Notification email" name="notification_email" type="email" defaultValue={business.notification_email ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Booking buffer (min)" name="booking_buffer_minutes" type="number" defaultValue={String(business.booking_buffer_minutes ?? 15)} />
            <Field label="Cancellation cutoff (hrs)" name="cancellation_cutoff_hours" type="number" defaultValue={String(business.cancellation_cutoff_hours ?? 24)} />
          </div>
        </div>
      </section>

      {/* Trading hours edit */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Trading hours</h2>
        <div className="space-y-3">
          {DAYS.map(day => {
            const hours = business.trading_hours?.[day]
            return (
              <div key={day} className="flex items-center gap-3">
                <span className="capitalize text-sm text-gray-700 font-medium w-24">{day}</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closed[day]}
                    onChange={e => setClosed(c => ({ ...c, [day]: e.target.checked }))}
                    className="rounded"
                  />
                  Closed
                </label>
                {!closed[day] && (
                  <>
                    <input
                      type="time"
                      name={`hours_${day}_open`}
                      defaultValue={hours?.open ?? '09:00'}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400 text-sm">–</span>
                    <input
                      type="time"
                      name={`hours_${day}_close`}
                      defaultValue={hours?.close ?? '17:00'}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null) }}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
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

function Field({ label, name, defaultValue, type = 'text', required }: {
  label: string; name: string; defaultValue: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )
}
