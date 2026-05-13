import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import type { Business } from "@/types";

const industries = [
  "HVAC / Trades",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Lawn Care",
  "Medical / Clinic",
  "Dental",
  "Physiotherapy",
  "Other",
];

const timezones = [
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Australia/Sydney",
  "Australia/Melbourne",
  "UTC",
];

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .single() as { data: Business | null };

  const hours = business?.trading_hours;

  const days = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ] as const;

  return (
    <>
      <Topbar title="Settings" businessName={business?.name} />
      <div className="flex-1 p-6 overflow-y-auto">
        <form action="/api/settings" method="POST" className="max-w-2xl space-y-8">
          <input type="hidden" name="business_id" value={business?.id ?? ""} />

          {/* Business */}
          <section className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Business</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              {[
                { name: "name", label: "Business name", value: business?.name ?? "", type: "text" },
                { name: "phone", label: "Phone number", value: business?.phone ?? "", type: "tel" },
                { name: "sms_number", label: "SMS number (ClickSend)", value: business?.sms_number ?? "", type: "tel" },
              ].map(({ name, label, value, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-[#374151] mb-1">{label}</label>
                  <input
                    type={type}
                    name={name}
                    defaultValue={value}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">Industry</label>
                <select
                  name="industry"
                  defaultValue={business?.industry}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  {industries.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">Timezone</label>
                <select
                  name="timezone"
                  defaultValue={business?.timezone}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Trading hours */}
          <section className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Trading Hours</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {days.map((day) => {
                const dayHours = hours?.[day];
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm text-[#374151] w-24 capitalize">{day}</span>
                    <input
                      type="time"
                      name={`hours_${day}_open`}
                      defaultValue={dayHours?.open ?? "08:00"}
                      className="px-2 py-1.5 border border-[#E5E7EB] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                    <span className="text-sm text-[#6B7280]">to</span>
                    <input
                      type="time"
                      name={`hours_${day}_close`}
                      defaultValue={dayHours?.close ?? "17:00"}
                      className="px-2 py-1.5 border border-[#E5E7EB] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        name={`hours_${day}_enabled`}
                        defaultChecked={dayHours?.enabled ?? false}
                        className="rounded border-[#E5E7EB] text-[#6366F1] focus:ring-[#6366F1]"
                      />
                      <span className="text-sm text-[#6B7280]">Open</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                Notifications
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                {
                  name: "notify_email_escalation",
                  label: "Email me when an agent escalates",
                  checked: business?.notify_email_escalation ?? true,
                },
                {
                  name: "notify_email_booking",
                  label: "Email me when a booking is confirmed",
                  checked: business?.notify_email_booking ?? true,
                },
                {
                  name: "notify_sms_escalation",
                  label: "SMS me when an agent escalates",
                  checked: business?.notify_sms_escalation ?? false,
                },
              ].map(({ name, label, checked }) => (
                <label key={name} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={checked}
                    className="rounded border-[#E5E7EB] text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <span className="text-sm text-[#374151]">{label}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
