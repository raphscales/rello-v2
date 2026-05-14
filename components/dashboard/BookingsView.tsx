'use client'

import { useState } from 'react'
import { LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react'

interface Booking {
  id: string
  customer_name: string | null
  customer_phone: string
  service: string | null
  scheduled_at: string
  status: string
  duration_minutes: number | null
}

interface Props {
  bookings: Booking[]
  timezone: string
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:   'bg-green-100 text-green-700',
  pending:     'bg-yellow-100 text-yellow-700',
  rescheduled: 'bg-blue-100 text-blue-700',
  cancelled:   'bg-red-100 text-red-700',
  no_show:     'bg-gray-100 text-gray-600',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('en-NZ', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('en-NZ', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function BookingsView({ bookings, timezone }: Props) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Current month state
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const monthName = new Date(year, month).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Build calendar grid (Mon–Sun)
  const firstDay = new Date(year, month, 1)
  // getDay(): 0=Sun,1=Mon...6=Sat → convert to Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - startOffset + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  // Map bookings to local day numbers for this month
  function bookingsForDay(day: number) {
    return bookings.filter(b => {
      const d = new Date(b.scheduled_at)
      const localStr = d.toLocaleDateString('en-NZ', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' })
      const [dd, mm, yyyy] = localStr.split('/').map(Number)
      return yyyy === year && mm === month + 1 && dd === day
    })
  }

  const selectedBookings = selectedDay ? bookingsForDay(selectedDay) : []
  const selectedDateLabel = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  // List view: group upcoming bookings by day
  const upcoming = bookings.filter(b => new Date(b.scheduled_at) >= today && b.status !== 'cancelled')
  const past = bookings.filter(b => new Date(b.scheduled_at) < today || b.status === 'cancelled')

  function groupByDay(bks: Booking[]) {
    const groups: { label: string; date: string; items: Booking[] }[] = []
    for (const b of bks) {
      const label = formatDate(b.scheduled_at, timezone)
      const existing = groups.find(g => g.label === label)
      if (existing) existing.items.push(b)
      else groups.push({ label, date: b.scheduled_at, items: [b] })
    }
    return groups
  }

  const upcomingGroups = groupByDay(upcoming)
  const pastGroups = groupByDay(past).reverse()

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Appointments booked by your agents</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid className="w-4 h-4" /> Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-4 h-4" /> List
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-900">{monthName}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const isSelected = day === selectedDay
                const dayBookings = day ? bookingsForDay(day) : []
                return (
                  <div
                    key={i}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 transition-colors ${
                      !day ? 'bg-gray-50/50' : isSelected ? 'bg-indigo-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {day && (
                      <>
                        <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${
                          isToday ? 'bg-indigo-600 text-white' : isSelected ? 'bg-indigo-200 text-indigo-800' : 'text-gray-500'
                        }`}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayBookings.slice(0, 2).map((b, bi) => (
                            <div key={bi} className="bg-indigo-50 text-indigo-700 text-[10px] rounded px-1 py-0.5 truncate leading-tight border border-indigo-100">
                              {formatTime(b.scheduled_at, timezone)} {b.customer_name ?? b.customer_phone}
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-[10px] text-gray-400 pl-1">+{dayBookings.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day panel */}
          {selectedDay && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-900">{selectedDateLabel}</span>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              {selectedBookings.length === 0 ? (
                <div className="px-5 py-6 text-sm text-gray-400 text-center italic">No bookings on this day</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {selectedBookings.map(b => (
                    <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-gray-500 w-16">{formatTime(b.scheduled_at, timezone)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{b.customer_name ?? b.customer_phone}</div>
                          <div className="text-xs text-gray-400">{b.service ?? 'Appointment'} · {b.duration_minutes ?? 60}min</div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Upcoming ({upcoming.length})
            </h2>
            {upcomingGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">No upcoming bookings.</div>
            ) : (
              <div className="space-y-3">
                {upcomingGroups.map(group => (
                  <div key={group.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {group.items.map(b => (
                        <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-gray-500 w-16">{formatTime(b.scheduled_at, timezone)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{b.customer_name ?? b.customer_phone}</div>
                              <div className="text-xs text-gray-400">{b.service ?? 'Appointment'} · {b.duration_minutes ?? 60}min</div>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Past ({past.length})
            </h2>
            {pastGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">No past bookings.</div>
            ) : (
              <div className="space-y-3 opacity-70">
                {pastGroups.map(group => (
                  <div key={group.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {group.items.map(b => (
                        <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-gray-500 w-16">{formatTime(b.scheduled_at, timezone)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{b.customer_name ?? b.customer_phone}</div>
                              <div className="text-xs text-gray-400">{b.service ?? 'Appointment'} · {b.duration_minutes ?? 60}min</div>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
