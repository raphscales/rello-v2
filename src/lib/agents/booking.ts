import Anthropic from "@anthropic-ai/sdk";
import type { Business, Message } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type BookingAgentResult = {
  reply: string;
  booking?: {
    customer_name: string;
    service: string;
    scheduled_at: string; // ISO string
  };
  status: "collecting" | "confirmed" | "failed";
};

/**
 * Booking Agent — collects name, service, time and confirms appointment.
 * Signals BOOKING_CONFIRMED when it has all details.
 */
export async function runBookingAgent(
  business: Business,
  messages: Message[],
  customerMessage: string
): Promise<BookingAgentResult> {
  const systemPrompt = `${business.booking_brief}

Business name: ${business.name}
Industry: ${business.industry}
Timezone: ${business.timezone}
Current time: ${new Date().toISOString()}

Collect:
1. Customer name
2. Service needed
3. Preferred date and time

When you have all three, confirm the booking clearly.

Respond in JSON:
{
  "reply": "<your SMS reply>",
  "status": "collecting" | "confirmed" | "failed",
  "booking": {
    "customer_name": "<name or null>",
    "service": "<service or null>",
    "scheduled_at": "<ISO datetime or null>"
  }
}

Rules:
- Keep SMS replies short (max 3 sentences)
- scheduled_at must be a valid ISO 8601 datetime in UTC
- Only set status to "confirmed" when all booking details are collected and confirmed with the customer`;

  const history = messages.map((m) => ({
    role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));
  history.push({ role: "user", content: customerMessage });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: systemPrompt,
    messages: history,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text) as BookingAgentResult;
  } catch {
    return {
      reply: "Thanks! Let me check on that and get back to you shortly.",
      status: "collecting",
    };
  }
}
