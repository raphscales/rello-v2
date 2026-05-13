import Anthropic from "@anthropic-ai/sdk";
import type { Business, Conversation, Message } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type OrchestratorDecision = {
  action: "followup" | "booking" | "rescheduling" | "escalate" | "resolve";
  reason: string;
};

/**
 * Orchestrator — uses Claude Sonnet to decide which specialist agent
 * should handle the next step of a conversation.
 */
export async function orchestrate(
  business: Business,
  conversation: Conversation,
  messages: Message[],
  incomingMessage: string
): Promise<OrchestratorDecision> {
  const history = messages
    .map((m) => `${m.role === "agent" ? "Agent" : "Customer"}: ${m.content}`)
    .join("\n");

  const prompt = `You are a routing orchestrator for a business AI front-office system.

Business: ${business.name} (${business.industry})
Current agent handling this conversation: ${conversation.agent_type}
Current conversation status: ${conversation.status}

Conversation history:
${history || "(no messages yet)"}

New customer message: "${incomingMessage}"

Based on the conversation, decide what action to take:
- "followup" — continue initial follow-up (just missed a call, haven't established intent yet)
- "booking" — customer wants to book an appointment
- "rescheduling" — customer wants to change an existing booking
- "escalate" — agent cannot handle this (angry customer, complex issue, or repeated confusion)
- "resolve" — conversation is complete, no further action needed

Respond in JSON only: {"action": "<action>", "reason": "<one sentence reason>"}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text) as OrchestratorDecision;
  } catch {
    return { action: "followup", reason: "Could not parse orchestrator response" };
  }
}
