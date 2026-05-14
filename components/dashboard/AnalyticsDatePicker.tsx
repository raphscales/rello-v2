'use client'

import { useRouter, usePathname } from 'next/navigation'

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
]

export default function AnalyticsDatePicker({ range }: { range: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => router.push(`${pathname}?range=${r.value}`)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            range === r.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
