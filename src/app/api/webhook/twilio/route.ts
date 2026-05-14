export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runFollowupAgent } from "@/lib/agents/followup";
import { sendSMS } from "@/lib/clicksend";
import { missedCallTwiML } from "@/lib/twilio";
import type { Business } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const formData = await req.formData();
    const callerNumber = formData.get("From") as string;
    const calledNumber = formData.get("To") as string;
    const callStatus = formData.get("CallStatus") as string;

    // We only fire follow-up on no-answer / busy / failed (missed calls)
    const missedStatuses = ["no-answer", "busy", "failed"];
    if (!missedStatuses.includes(callStatus)) {
      return new NextResponse(missedCallTwiML(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find business by Twilio number
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("phone", calledNumber)
      .single() as { data: Business | null };

    if (!business || !business.followup_enabled || !business.sms_number) {
      return new NextResponse(missedCallTwiML(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Log the call
    const { data: call } = await supabase
      .from("calls")
      .insert({
        business_id: business.id,
        caller_number: callerNumber,
        called_at: new Date().toISOString(),
        followup_sent: false,
      })
      .select()
      .single();

    // Create new conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .insert({
        business_id: business.id,
        call_id: call?.id ?? null,
        customer_number: callerNumber,
        agent_type: "followup",
        status: "active",
      })
      .select()
      .single();

    // Generate and send follow-up SMS
    const reply = await runFollowupAgent(business, []);

    if (reply && conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        role: "agent",
        content: reply,
      });
      await sendSMS(callerNumber, reply);
      await supabase
        .from("calls")
        .update({ followup_sent: true, followup_sent_at: new Date().toISOString() })
        .eq("id", call?.id);
    }

    return new NextResponse(missedCallTwiML(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("Twilio webhook error:", err);
    return new NextResponse(missedCallTwiML(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
