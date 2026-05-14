import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const range = req.nextUrl.searchParams.get('range') ?? '7d'
  const daysBack = range === 'today' ? 1 : range === '30d' ? 30 : 7

  const { data: business } = await supabase.from('businesses').select('id, timezone').single()
  if (!business) return new Response('Unauthorized', { status: 401 })

  const since = new Date()
  since.setDate(since.getDate() - (daysBack - 1))
  since.setHours(0, 0, 0, 0)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('customer_name, customer_phone, service, scheduled_at, status, created_at')
    .eq('business_id', business.id)
    .gte('created_at', since.toISOString())
    .order('scheduled_at', { ascending: true })

  const rows = (bookings ?? []).map(b => [
    b.customer_name ?? '',
    b.customer_phone,
    b.service ?? '',
    new Date(b.scheduled_at).toLocaleString('en-NZ', { timeZone: business.timezone }),
    b.status,
    new Date(b.created_at).toLocaleString('en-NZ', { timeZone: business.timezone }),
  ])

  const csv = [
    ['Customer Name', 'Phone', 'Service', 'Scheduled At', 'Status', 'Created At'],
    ...rows,
  ]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings-${range}.csv"`,
    },
  })
}
