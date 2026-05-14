// Twilio is used for inbound VOICE only (missed call detection).
// SMS is handled by ClickSend.

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(sortedParams)
    .digest("base64");
  return expected === signature;
}

export function missedCallTwiML(): string {
  // Returns TwiML that plays a brief message and hangs up.
  // The webhook handler fires the follow-up agent after this.
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="w"></Play>
  <Hangup/>
</Response>`;
}
