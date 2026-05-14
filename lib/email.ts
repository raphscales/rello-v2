import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Rello <onboarding@resend.dev>'

export async function sendBookingConfirmation({
  to,
  businessName,
  customerName,
  customerPhone,
  service,
  scheduledAt,
  timezone,
}: {
  to: string
  businessName: string
  customerName: string | null
  customerPhone: string
  service: string | null
  scheduledAt: string
  timezone: string
}) {
  const time = new Date(scheduledAt).toLocaleString('en-NZ', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New booking confirmed — ${customerName ?? customerPhone}`,
    html: `
      <p>A new booking has been confirmed for <strong>${businessName}</strong>.</p>
      <table style="border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Customer</td><td><strong>${customerName ?? 'Unknown'}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Phone</td><td>${customerPhone}</td></tr>
        ${service ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Service</td><td>${service}</td></tr>` : ''}
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Time</td><td><strong>${time}</strong></td></tr>
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:14px">Sent by Rello</p>
    `,
  })
}

export async function sendBookingReminder({
  to,
  businessName,
  customerName,
  customerPhone,
  service,
  scheduledAt,
  timezone,
}: {
  to: string
  businessName: string
  customerName: string | null
  customerPhone: string
  service: string | null
  scheduledAt: string
  timezone: string
}) {
  const time = new Date(scheduledAt).toLocaleString('en-NZ', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: appointment tomorrow — ${customerName ?? customerPhone}`,
    html: `
      <p>You have an upcoming appointment tomorrow at <strong>${businessName}</strong>.</p>
      <table style="border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Customer</td><td><strong>${customerName ?? 'Unknown'}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Phone</td><td>${customerPhone}</td></tr>
        ${service ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Service</td><td>${service}</td></tr>` : ''}
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Time</td><td><strong>${time}</strong></td></tr>
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:14px">Sent by Rello</p>
    `,
  })
}
