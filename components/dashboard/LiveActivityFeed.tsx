'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ActivityItem {
  id: string
  type: 'booking' | 'message' | 'conversation'
  description: string
  at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TYPE_DOT: Record<ActivityItem['type'], string> = {
  booking:      'bg-green-500',
  message:      'bg-indigo-500',
  conversation: 'bg-blue-500',
}

const TYPE_LABEL: Record<ActivityItem['type'], string> = {
  booking:      'Booking',
  message:      'Agent replied',
  conversation: 'New enquiry',
}

export default function LiveActivityFeed({
  businessId,
  initial,
}: {
  businessId: string
  initial: ActivityItem[]
}) {
  const [items, setItems] = useState<ActivityItem[]>(initial)
  const [, tick] = useState(0)
  const supabase = createClient()

  // Refresh relative timestamps every minute
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`activity:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `business_id=eq.${businessId}`,
        },
        payload => {
          const msg = payload.new as {
            id: string
            direction: string
            body: string
            sent_at: string
          }
          if (msg.direction !== 'outbound') return
          const preview = msg.body.length > 70 ? msg.body.slice(0, 70) + '…' : msg.body
          setItems(prev =>
            [{ id: msg.id, type: 'message', description: `"${preview}"`, at: msg.sent_at }, ...prev].slice(0, 20)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `business_id=eq.${businessId}`,
        },
        payload => {
          const b = payload.new as {
            id: string
            customer_name: string | null
            customer_phone: string
            service: string | null
            created_at: string
          }
          const who = b.customer_name ?? b.customer_phone
          const what = b.service ? ` · ${b.service}` : ''
          setItems(prev =>
            [{ id: b.id, type: 'booking', description: `${who}${what}`, at: b.created_at }, ...prev].slice(0, 20)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${businessId}`,
        },
        payload => {
          const c = payload.new as {
            id: string
            customer_phone: string
            created_at: string
          }
          setItems(prev =>
            [{ id: c.id, type: 'conversation', description: c.customer_phone, at: c.created_at }, ...prev].slice(0, 20)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, supabase])

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Live activity</h2>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          No activity yet — agents are ready when your first customer reaches out.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map(item => (
            <li key={item.id} className="px-5 py-3 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[item.type]}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-500">{TYPE_LABEL[item.type]} </span>
                <span className="text-sm text-gray-700 truncate">{item.description}</span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
