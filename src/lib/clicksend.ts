const CLICKSEND_BASE = "https://rest.clicksend.com/v3";

function authHeader() {
  const credentials = Buffer.from(
    `${process.env.CLICKSEND_USERNAME}:${process.env.CLICKSEND_API_KEY}`
  ).toString("base64");
  return `Basic ${credentials}`;
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const body = {
    messages: [
      {
        source: "rello",
        from: process.env.CLICKSEND_FROM,
        body: message,
        to,
      },
    ],
  };

  const res = await fetch(`${CLICKSEND_BASE}/sms/send`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickSend error ${res.status}: ${text}`);
  }
}
