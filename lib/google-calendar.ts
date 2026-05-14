import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
  )
}

export function getAuthUrl(): string {
  const client = makeOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  })
}

export async function exchangeCode(code: string) {
  const client = makeOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

async function getCalendarClient(tokens: Record<string, unknown>) {
  const client = makeOAuth2Client()
  client.setCredentials(tokens)

  // Persist refreshed tokens back to DB automatically
  client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token || newTokens.access_token) {
      const supabase = createServiceClient()
      const merged = { ...tokens, ...newTokens }
      await supabase
        .from('businesses')
        .update({ google_calendar_token: merged })
        .eq('google_calendar_token->>access_token', (tokens as Record<string, string>).access_token)
    }
  })

  return google.calendar({ version: 'v3', auth: client })
}

export async function createCalendarEvent(
  tokens: Record<string, unknown>,
  booking: {
    id: string
    customer_name: string | null
    customer_phone: string
    service: string | null
    scheduled_at: string
    duration_minutes: number
    notes: string | null
  },
  timezone: string
): Promise<string | null> {
  try {
    const calendar = await getCalendarClient(tokens)
    const start = new Date(booking.scheduled_at)
    const end = new Date(start.getTime() + booking.duration_minutes * 60 * 1000)

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `${booking.service ?? 'Appointment'} – ${booking.customer_name ?? booking.customer_phone}`,
        description: [
          `Customer: ${booking.customer_name ?? 'Unknown'}`,
          `Phone: ${booking.customer_phone}`,
          booking.service ? `Service: ${booking.service}` : null,
          booking.notes ? `Notes: ${booking.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
      },
    })

    return event.data.id ?? null
  } catch (err) {
    console.error('[gcal] createCalendarEvent error:', err)
    return null
  }
}

export async function updateCalendarEvent(
  tokens: Record<string, unknown>,
  eventId: string,
  booking: {
    customer_name: string | null
    customer_phone: string
    service: string | null
    scheduled_at: string
    duration_minutes: number
    notes: string | null
  },
  timezone: string
): Promise<void> {
  try {
    const calendar = await getCalendarClient(tokens)
    const start = new Date(booking.scheduled_at)
    const end = new Date(start.getTime() + booking.duration_minutes * 60 * 1000)

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: `${booking.service ?? 'Appointment'} – ${booking.customer_name ?? booking.customer_phone}`,
        description: [
          `Customer: ${booking.customer_name ?? 'Unknown'}`,
          `Phone: ${booking.customer_phone}`,
          booking.service ? `Service: ${booking.service}` : null,
          booking.notes ? `Notes: ${booking.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
      },
    })
  } catch (err) {
    console.error('[gcal] updateCalendarEvent error:', err)
  }
}

export async function deleteCalendarEvent(
  tokens: Record<string, unknown>,
  eventId: string
): Promise<void> {
  try {
    const calendar = await getCalendarClient(tokens)
    await calendar.events.delete({ calendarId: 'primary', eventId })
  } catch (err) {
    console.error('[gcal] deleteCalendarEvent error:', err)
  }
}
