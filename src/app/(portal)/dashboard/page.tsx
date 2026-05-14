import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import type { DashboardData } from "@/types";

async function getDashboardData(businessId: string): Promise<DashboardData | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard?business_id=${businessId}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function formatBookingTime(isoStr: string, timezone: string) {
  return new Date(isoStr).toLocaleString("en-NZ", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const activityIcon: Record<string, string> = {
  booking_confirmed: "●",
  followup_sent: "●",
  missed_call: "●",
  rescheduled: "●",
  escalated: "⚠",
};

const activityColor: Record<string, string> = {
  booking_confirmed: "text-[#10B981]",
  followup_sent: "text-[#6366F1]",
  missed_call: "text-[#6B7280]",
  rescheduled: "text-[#F59E0B]",
  escalated: "text-[#EF4444]",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, timezone")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const today = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: businesses?.timezone ?? "Pacific/Auckland",
  });

  const data = businesses ? await getDashboardData(businesses.id) : null;

  if (!businesses) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280] text-sm">No business found.</p>
          <a href="/settings" className="text-[#6366F1] text-sm hover:underline">
            Set up your business →
          </a>
        </div>
      </div>
    );
  }

  const agents = data?.agents;
  const activeCount = agents
    ? [agents.followup, agents.booking, agents.rescheduling].filter((a) => a.enabled).length
    : 0;

  return (
    <>
      <Topbar title="Dashboard" businessName={businesses.name} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">
            Good morning, {businesses.name}
          </h2>
          <p className="text-sm text-[#6B7280] mt-0.5">{today}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Calls handled", value: data?.kpis.calls_handled ?? 0, href: "/analytics" },
            { label: "Bookings confirmed", value: data?.kpis.bookings_confirmed ?? 0, href: "/bookings" },
            { label: "Follow-ups sent", value: data?.kpis.followups_sent ?? 0, href: "/analytics" },
          ].map(({ label, value, href }) => (
            <a
              key={label}
              href={href}
              className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:border-[#6366F1] transition-colors"
            >
              <p className="text-sm text-[#6B7280]">{label}</p>
              <p className="text-3xl font-bold text-[#111827] mt-1">{value}</p>
            </a>
          ))}
        </div>

        {/* Agents */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
              Your Agents
            </p>
            <span className="text-xs text-[#10B981] font-medium">
              ● {activeCount}/3 active
            </span>
          </div>
          {agents ? (
            <div className="divide-y divide-[#E5E7EB]">
              {(
                [
                  ["followup", agents.followup],
                  ["booking", agents.booking],
                  ["rescheduling", agents.rescheduling],
                ] as const
              ).map(([key, agent]) => (
                <div key={key} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${agent.enabled ? "text-[#10B981]" : "text-[#D1D5DB]"}`}
                    >
                      ●
                    </span>
                    <span className="text-sm text-[#111827]">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#6B7280]">
                      {agent.messages_today} msgs today
                    </span>
                    <a
                      href="/agents"
                      className="text-xs text-[#6366F1] hover:underline"
                    >
                      Config
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-sm text-[#6B7280]">No agent data yet.</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Live Activity */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Live Activity
              </p>
              <a href="/conversations" className="text-xs text-[#6366F1] hover:underline">
                View all
              </a>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {data?.activity && data.activity.length > 0 ? (
                data.activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs flex-shrink-0 ${activityColor[item.type] ?? "text-[#6B7280]"}`}>
                        {activityIcon[item.type] ?? "●"}
                      </span>
                      <span className="text-sm text-[#374151] truncate">{item.description}</span>
                    </div>
                    <span className="text-xs text-[#9CA3AF] flex-shrink-0 ml-3">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-[#6B7280]">No activity yet today.</div>
              )}
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Upcoming Bookings
              </p>
              <a href="/bookings" className="text-xs text-[#6366F1] hover:underline">
                View all
              </a>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {data?.upcoming_bookings && data.upcoming_bookings.length > 0 ? (
                data.upcoming_bookings.map((booking) => (
                  <div key={booking.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-[#111827]">{booking.customer_name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {booking.service} ·{" "}
                      {formatBookingTime(booking.scheduled_at, businesses.timezone)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-[#6B7280]">No upcoming bookings.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
