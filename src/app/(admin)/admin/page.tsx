import { createClient } from "@/lib/supabase/server";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-NZ");
}

export default async function AdminPage() {
  const supabase = createClient();

  // Admin uses service role to see all businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#111827]">All Clients</h1>
        <a
          href="/admin/new"
          className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors"
        >
          + Add client
        </a>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        {businesses && businesses.length > 0 ? (
          <div className="divide-y divide-[#E5E7EB]">
            {(businesses as { id: string; name: string; created_at: string }[]).map((b) => (
              <a
                key={b.id}
                href={`/admin/${b.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#10B981]">●</span>
                  <p className="text-sm font-medium text-[#111827]">{b.name}</p>
                </div>
                <span className="text-xs text-[#9CA3AF]">Created {timeAgo(b.created_at)}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-[#6B7280]">
            No clients yet.
          </div>
        )}
      </div>
    </div>
  );
}
