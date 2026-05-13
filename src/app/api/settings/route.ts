export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const businessId = formData.get("business_id") as string;

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const trading_hours: Record<string, { open: string; close: string; enabled: boolean }> = {};
  for (const day of days) {
    trading_hours[day] = {
      open: (formData.get(`hours_${day}_open`) as string) ?? "08:00",
      close: (formData.get(`hours_${day}_close`) as string) ?? "17:00",
      enabled: formData.get(`hours_${day}_enabled`) === "on",
    };
  }

  const updates = {
    name: formData.get("name") as string,
    industry: formData.get("industry") as string,
    phone: formData.get("phone") as string,
    sms_number: formData.get("sms_number") as string,
    timezone: formData.get("timezone") as string,
    trading_hours,
    notify_email_escalation: formData.get("notify_email_escalation") === "on",
    notify_email_booking: formData.get("notify_email_booking") === "on",
    notify_sms_escalation: formData.get("notify_sms_escalation") === "on",
  };

  const { error } = businessId
    ? await supabase.from("businesses").update(updates).eq("id", businessId).eq("owner_id", user.id)
    : await supabase.from("businesses").insert({ ...updates, owner_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/settings?saved=1", req.url));
}
