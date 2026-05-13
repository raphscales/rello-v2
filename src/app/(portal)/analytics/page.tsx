import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = searchParams.range ?? "7";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, timezone")
    .eq("owner_id", user!.id)
    .single();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(range));

  const [{ count: bookingsCount }, { count: callsCount }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business?.id)
      .gte("created_at", startDate.toISOString()),
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business?.id)
      .gte("called_at", startDate.toISOString()),
  ]);

  const conversionRate =
    callsCount && callsCount > 0
      ? Math.round(((bookingsCount ?? 0) / callsCount) * 100)
      : 0;

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business?.id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  const ranges = [
    { value: "1", label: "Today" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
  ];

  return (
    <>
      <Topbar title="Analytics" businessName={business?.name} />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Range picker */}
        <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-lg w-fit">
          {ranges.map(({ value, label }) => (
            <a
              key={value}
              href={`/analytics?range=${value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === value
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Bookings confirmed", value: bookingsCount ?? 0 },
            { label: "Calls handled", value: callsCount ?? 0 },
            { label: "Conversion rate", value: `${conversionRate}%` },
            { label: "Avg response time", value: "< 60s" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-[#111827] mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Bookings table */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
              Bookings
            </p>
          </div>
          {recentBookings && recentBookings.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {["Date", "Customer", "Service", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {(recentBookings as { id: string; customer_name: string; service: string; scheduled_at: string; status: string }[]).map((b) => (
                  <tr key={b.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3 text-[#6B7280]">
                      {new Date(b.scheduled_at).toLocaleDateString("en-NZ", {
                        timeZone: business?.timezone,
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#111827]">{b.customer_name}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{b.service}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.status === "confirmed"
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : b.status === "cancelled"
                            ? "bg-[#FEE2E2] text-[#991B1B]"
                            : "bg-[#FEF3C7] text-[#92400E]"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-[#6B7280]">
              No bookings in this period.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
