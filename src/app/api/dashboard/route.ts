export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DashboardData } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const { data: business } = await supabase
    .from("businesses")
    .select("followup_name, booking_name, reschedule_name, followup_enabled, booking_enabled, reschedule_enabled")
    .eq("id", businessId)
    .single();

  const [
    { count: callsHandled },
    { count: bookingsConfirmed },
    { count: followupsSent },
    { data: recentConversations },
    { data: upcomingBookings },
  ] = await Promise.all([
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("called_at", todayISO),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .gte("created_at", todayISO),
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("followup_sent", true)
      .gte("called_at", todayISO),
    supabase
      .from("conversations")
      .select("id, agent_type, status, customer_number, updated_at")
      .eq("business_id", businessId)
      .gte("updated_at", todayISO)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
  ]);

  // Build activity feed from recent conversations
  type ActivityType = "escalated" | "booking_confirmed" | "rescheduled" | "followup_sent" | "missed_call";
  type ConvoRow = { id: string; agent_type: string; status: string; customer_number: string; updated_at: string };
  const activity = (recentConversations ?? [] as ConvoRow[]).map((c: ConvoRow) => {
    const type: ActivityType =
      c.status === "escalated"
        ? "escalated"
        : c.agent_type === "booking"
        ? "booking_confirmed"
        : c.agent_type === "rescheduling"
        ? "rescheduled"
        : "followup_sent";
    return ({
    id: c.id,
    type,
    description:
      c.status === "escalated"
        ? `Escalated — needs your attention`
        : c.agent_type === "booking"
        ? `Booking handled for ${c.customer_number}`
        : c.agent_type === "rescheduling"
        ? `Rescheduling handled for ${c.customer_number}`
        : `Follow-up sent to ${c.customer_number}`,
    customer_number: c.customer_number,
    created_at: c.updated_at,
  });
  });

  // Agent message counts
  const agentCounts = await Promise.all(
    ["followup", "booking", "rescheduling"].map(async (type) => {
      const { count } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("agent_type", type)
        .gte("updated_at", todayISO);
      return count ?? 0;
    })
  );

  const data: DashboardData = {
    kpis: {
      calls_handled: callsHandled ?? 0,
      bookings_confirmed: bookingsConfirmed ?? 0,
      followups_sent: followupsSent ?? 0,
    },
    agents: {
      followup: {
        name: business?.followup_name ?? "Follow-up Agent",
        enabled: business?.followup_enabled ?? true,
        messages_today: agentCounts[0],
        last_active: null,
      },
      booking: {
        name: business?.booking_name ?? "Booking Agent",
        enabled: business?.booking_enabled ?? true,
        messages_today: agentCounts[1],
        last_active: null,
      },
      rescheduling: {
        name: business?.reschedule_name ?? "Rescheduling Agent",
        enabled: business?.reschedule_enabled ?? true,
        messages_today: agentCounts[2],
        last_active: null,
      },
    },
    activity,
    upcoming_bookings: (upcomingBookings ?? []) as DashboardData["upcoming_bookings"],
  };

  return NextResponse.json(data);
}
