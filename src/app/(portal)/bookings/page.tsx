import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import type { Booking } from "@/types";

function formatDate(isoStr: string, timezone: string) {
  return new Date(isoStr).toLocaleString("en-NZ", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusBadge: Record<Booking["status"], string> = {
  confirmed: "bg-[#D1FAE5] text-[#065F46]",
  cancelled: "bg-[#FEE2E2] text-[#991B1B]",
  rescheduled: "bg-[#FEF3C7] text-[#92400E]",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter ?? "upcoming";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, timezone")
    .eq("owner_id", user!.id)
    .single();

  let query = supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business?.id)
    .order("scheduled_at", { ascending: true });

  const now = new Date().toISOString();
  if (filter === "upcoming") query = query.gte("scheduled_at", now);
  if (filter === "past") query = query.lt("scheduled_at", now);
  if (filter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query = query.gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
  }

  const { data: bookings } = await query.limit(50);

  const filters = ["all", "upcoming", "past", "today"];

  return (
    <>
      <Topbar title="Bookings" businessName={business?.name} />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-lg w-fit mb-6">
          {filters.map((f) => (
            <a
              key={f}
              href={`/bookings?filter=${f}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {f}
            </a>
          ))}
        </div>

        {/* Bookings list */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          {bookings && bookings.length > 0 ? (
            <div className="divide-y divide-[#E5E7EB]">
              {(bookings as Booking[]).map((booking) => (
                <div key={booking.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#111827]">
                        {booking.customer_name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[booking.status]}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {booking.service} ·{" "}
                      {formatDate(booking.scheduled_at, business?.timezone ?? "Pacific/Auckland")}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{booking.customer_number}</p>
                  </div>
                  {booking.conversation_id && (
                    <a
                      href={`/conversations?id=${booking.conversation_id}`}
                      className="text-xs text-[#6366F1] hover:underline"
                    >
                      View conversation →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-[#6B7280]">No bookings found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
