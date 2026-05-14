export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { orchestrate } from "@/lib/agents/orchestrator";
import { runFollowupAgent } from "@/lib/agents/followup";
import { runBookingAgent } from "@/lib/agents/booking";
import { runReschedulingAgent } from "@/lib/agents/rescheduling";
import { sendSMS } from "@/lib/clicksend";
import type { Business, Conversation, Message } from "@/types";

export async function POST(req: NextRequest) {
  // Service role client — bypasses RLS for webhook operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await req.json();

    // ClickSend inbound SMS payload
    const from: string = body.from ?? body.message?.from;
    const to: string = body.to ?? body.message?.to;
    const text: string = body.body ?? body.message?.body ?? "";

    if (!from || !to || !text) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find business by SMS number
    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("*")
      .eq("sms_number", to)
      .single() as { data: Business | null; error: Error | null };

    if (bizErr || !business) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.error("No business found for SMS number:", to);
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Find or create active conversation for this number
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("business_id", business.id)
      .eq("customer_number", from)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single() as { data: Conversation | null };

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({
          business_id: business.id,
          customer_number: from,
          agent_type: "followup",
          status: "active",
        })
        .select()
        .single();
      conversation = newConvo as Conversation;
    }

    if (!conversation) {
      return NextResponse.json({ error: "Could not create conversation" }, { status: 500 });
    }

    // If conversation is in manual override, don't auto-reply
    if (conversation.manual_override) {
      return NextResponse.json({ ok: true, skipped: "manual_override" });
    }

    // Store incoming message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "customer",
      content: text,
    });

    // Fetch message history
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }) as { data: Message[] | null };

    const history = messages ?? [];

    // Orchestrate: decide which agent handles this
    const decision = await orchestrate(business, conversation, history, text);

    let reply = "";

    if (decision.action === "escalate") {
      reply =
        "Let me get someone from the team to help you with this. They'll be in touch shortly.";
      await supabase
        .from("conversations")
        .update({ status: "escalated" })
        .eq("id", conversation.id);
    } else if (decision.action === "resolve") {
      await supabase
        .from("conversations")
        .update({ status: "resolved" })
        .eq("id", conversation.id);
      return NextResponse.json({ ok: true, resolved: true });
    } else if (decision.action === "booking" && business.booking_enabled) {
      // Update agent type if changing
      if (conversation.agent_type !== "booking") {
        await supabase
          .from("conversations")
          .update({ agent_type: "booking" })
          .eq("id", conversation.id);
      }

      const result = await runBookingAgent(business, history, text);
      reply = result.reply;

      if (result.status === "confirmed" && result.booking) {
        await supabase.from("bookings").insert({
          business_id: business.id,
          conversation_id: conversation.id,
          customer_name: result.booking.customer_name,
          customer_number: from,
          service: result.booking.service,
          scheduled_at: result.booking.scheduled_at,
          status: "confirmed",
        });
        await supabase
          .from("conversations")
          .update({ status: "resolved" })
          .eq("id", conversation.id);
      }
    } else if (decision.action === "rescheduling" && business.reschedule_enabled) {
      if (conversation.agent_type !== "rescheduling") {
        await supabase
          .from("conversations")
          .update({ agent_type: "rescheduling" })
          .eq("id", conversation.id);
      }

      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", business.id)
        .eq("customer_number", from)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const result = await runReschedulingAgent(business, existingBooking, history, text);
      reply = result.reply;

      if (result.status === "confirmed" && result.new_scheduled_at && existingBooking) {
        await supabase
          .from("bookings")
          .update({ scheduled_at: result.new_scheduled_at, status: "rescheduled" })
          .eq("id", existingBooking.id);
      } else if (result.status === "cancelled" && existingBooking) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", existingBooking.id);
      }
    } else if (business.followup_enabled) {
      reply = await runFollowupAgent(business, history, text);
    } else {
      return NextResponse.json({ ok: true, skipped: "agent_disabled" });
    }

    // Store and send reply
    if (reply) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        role: "agent",
        content: reply,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);
      await sendSMS(from, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ClickSend webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
