import Anthropic from "@anthropic-ai/sdk";
import type { Business, Booking, Message } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ReschedulingAgentResult = {
  reply: string;
  new_scheduled_at?: string; // ISO string
  status: "collecting" | "confirmed" | "cancelled" | "failed";
};

/**
 * Rescheduling Agent — handles booking changes and cancellations.
 */
export async function runReschedulingAgent(
  business: Business,
  existingBooking: Booking | null,
  messages: Message[],
  customerMessage: string
): Promise<ReschedulingAgentResult> {
  const bookingContext = existingBooking
    ? `Existing booking: ${existingBooking.service} on ${new Date(existingBooking.scheduled_at).toLocaleString("en-NZ", { timeZone: business.timezone })}`
    : "No existing booking found for this customer.";

  const systemPrompt = `${business.reschedule_brief}

Business name: ${business.name}
Timezone: ${business.timezone}
Current time: ${new Date().toISOString()}
${bookingContext}

Respond in JSON:
{
  "reply": "<your SMS reply>",
  "status": "collecting" | "confirmed" | "cancelled" | "failed",
  "new_scheduled_at": "<ISO datetime in UTC or null>"
}

Rules:
- Keep SMS replies short (max 3 sentences)
- Set status "confirmed" when the customer has agreed to a new time
- Set status "cancelled" if the customer wants to cancel entirely
- new_scheduled_at must be ISO 8601 UTC`;

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
    return JSON.parse(text) as ReschedulingAgentResult;
  } catch {
    return {
      reply: "Thanks for getting in touch. Let me look into your booking and get back to you.",
      status: "collecting",
    };
  }
}
