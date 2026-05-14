export default function CalendarPreview() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = 15

  // Mock calendar grid data
  const bookings: Record<number, { time: string; name: string; service: string }[]> = {
    3:  [{ time: '9:00am', name: 'Sarah M.', service: 'Haircut' }],
    7:  [{ time: '2:00pm', name: 'James K.', service: 'Colour' }, { time: '4:00pm', name: 'Lily P.', service: 'Blowout' }],
    12: [{ time: '11:00am', name: 'Tom R.', service: 'Trim' }],
    15: [{ time: '10:00am', name: 'Priya S.', service: 'Highlights' }, { time: '1:00pm', name: 'Daniel W.', service: 'Cut & Style' }],
    19: [{ time: '3:00pm', name: 'Emma L.', service: 'Haircut' }],
    22: [{ time: '9:30am', name: 'Noah B.', service: 'Trim' }],
    28: [{ time: '11:00am', name: 'Aria C.', service: 'Colour' }],
  }

  // Build 5-week grid starting from offset
  const startOffset = 1 // May 1 = Thursday (offset 3), but simplified for mockup
  const cells = Array.from({ length: 35 }, (_, i) => {
    const day = i - startOffset + 1
    return day >= 1 && day <= 31 ? day : null
  })

  // Mock day-grouped list
  const groupedDays = [
    { label: 'Today — Thursday 15 May', bookings: [
      { time: '10:00am', name: 'Priya S.', service: 'Highlights', status: 'confirmed' },
      { time: '1:00pm', name: 'Daniel W.', service: 'Cut & Style', status: 'pending' },
    ]},
    { label: 'Friday 16 May', bookings: [] },
    { label: 'Monday 19 May', bookings: [
      { time: '3:00pm', name: 'Emma L.', service: 'Haircut', status: 'confirmed' },
    ]},
    { label: 'Thursday 22 May', bookings: [
      { time: '9:30am', name: 'Noah B.', service: 'Trim', status: 'pending' },
    ]},
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bookings view — Option preview</h1>
      <p className="text-gray-500 mb-10 text-sm">Two layout options for the bookings calendar toggle</p>

      {/* OPTION A: Monthly Grid */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Option A</span>
          <span className="font-semibold text-gray-800">Monthly calendar grid</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button className="text-gray-400 hover:text-gray-600 text-lg">←</button>
            <h2 className="font-semibold text-gray-900">May 2026</h2>
            <button className="text-gray-400 hover:text-gray-600 text-lg">→</button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {days.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday = day === today
              const dayBookings = day ? bookings[day] : []
              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 ${!day ? 'bg-gray-50/50' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayBookings?.slice(0, 2).map((b, bi) => (
                          <div key={bi} className="bg-indigo-50 text-indigo-700 text-[10px] rounded px-1 py-0.5 truncate leading-tight">
                            {b.time} {b.name}
                          </div>
                        ))}
                        {dayBookings && dayBookings.length > 2 && (
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
      </div>

      {/* OPTION B: Day-grouped list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Option B</span>
          <span className="font-semibold text-gray-800">Day-grouped list</span>
        </div>

        <div className="max-w-2xl space-y-4">
          {groupedDays.map((group, gi) => (
            <div key={gi} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">{group.label}</span>
              </div>
              {group.bookings.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400 italic">No bookings</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {group.bookings.map((b, bi) => (
                    <div key={bi} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-gray-500 w-16">{b.time}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.service}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
