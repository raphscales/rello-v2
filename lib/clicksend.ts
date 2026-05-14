// ClickSend SMS — NZ-native SMS provider
// Ported from rello-v1 lib/clicksend.ts

interface SendSmsParams {
  to: string
  from: string
  body: string
}

interface ClickSendResponse {
  http_code: number
  response_code: string
  response_msg: string
}

export async function sendSms({ to, from, body }: SendSmsParams): Promise<void> {
  const username = process.env.CLICKSEND_USERNAME
  const apiKey = process.env.CLICKSEND_API_KEY

  if (!username || !apiKey) {
    throw new Error('ClickSend credentials not configured')
  }

  const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')

  const payload = {
    messages: [
      {
        body,
        to,
        from,
        source: 'rello-v2',
      },
    ],
  }

  const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickSend API error: ${response.status} ${error}`)
  }

  const data: ClickSendResponse = await response.json()

  if (data.http_code !== 200) {
    throw new Error(`ClickSend error: ${data.response_msg}`)
  }
}
