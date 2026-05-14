import Anthropic from "@anthropic-ai/sdk";
import type { Business, Message } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Follow-up Agent — handles initial outreach after a missed call.
 * Uses Claude Haiku (fast + cheap for leaf agent).
 */
export async function runFollowupAgent(
  business: Business,
  messages: Message[],
  customerMessage?: string
): Promise<string> {
  const isFirstMessage = messages.length === 0;

  const systemPrompt = `${business.followup_brief}

Business name: ${business.name}
Industry: ${business.industry}

Rules:
- Keep messages short and conversational (max 2 sentences)
- Never make up information about availability or pricing
- If the customer wants to book, say you can help with that
- If you cannot help or the customer is upset, say a team member will follow up`;

  const history = messages.map((m) => ({
    role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  if (isFirstMessage) {
    history.push({
      role: "user",
      content: "[SYSTEM: Customer missed call. Send initial follow-up message now.]",
    });
  } else if (customerMessage) {
    history.push({ role: "user", content: customerMessage });
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: systemPrompt,
    messages: history,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
