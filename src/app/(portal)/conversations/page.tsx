import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import type { Conversation, Message } from "@/types";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const statusBadge: Record<string, string> = {
  active: "text-[#10B981]",
  escalated: "text-[#EF4444]",
  resolved: "text-[#6B7280]",
  manual: "text-[#F59E0B]",
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { id?: string; filter?: string };
}) {
  const { id: selectedId, filter = "all" } = searchParams;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user!.id)
    .single();

  let query = supabase
    .from("conversations")
    .select("*, messages(id, role, content, created_at)")
    .eq("business_id", business?.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (filter !== "all") query = query.eq("agent_type", filter);

  const { data: rawConversations } = await query;
  const conversations = rawConversations as (Conversation & { messages: Message[] })[] | null;

  const selected = selectedId
    ? conversations?.find((c) => c.id === selectedId)
    : conversations?.[0];

  const messages: Message[] = selected?.messages ?? [];

  const filters = [
    { key: "all", label: "All" },
    { key: "followup", label: "Follow-up" },
    { key: "booking", label: "Booking" },
    { key: "rescheduling", label: "Rescheduling" },
    { key: "escalated", label: "Needs attention" },
  ];

  return (
    <>
      <Topbar title="Conversations" businessName={business?.name} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: thread list */}
        <div className="w-[320px] flex-shrink-0 border-r border-[#E5E7EB] flex flex-col bg-white">
          {/* Filter */}
          <div className="px-3 py-3 border-b border-[#E5E7EB]">
            <div className="flex flex-wrap gap-1">
              {filters.map(({ key, label }) => (
                <a
                  key={key}
                  href={`/conversations?filter=${key}`}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filter === key
                      ? "bg-[#EEF2FF] text-[#6366F1]"
                      : "text-[#6B7280] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {conversations && conversations.length > 0 ? (
              conversations.map((convo) => {
                const msgs = convo.messages;
                const lastMsg = msgs?.[msgs.length - 1];
                return (
                  <a
                    key={convo.id}
                    href={`/conversations?id=${convo.id}&filter=${filter}`}
                    className={`block px-4 py-3 hover:bg-[#F9FAFB] transition-colors ${
                      selected?.id === convo.id ? "bg-[#EEF2FF]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#111827] truncate">
                        {convo.customer_name ?? convo.customer_number}
                      </span>
                      <span className="text-xs text-[#9CA3AF] flex-shrink-0 ml-2">
                        {timeAgo(convo.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-xs ${statusBadge[convo.status] ?? "text-[#6B7280]"}`}>●</span>
                      <p className="text-xs text-[#6B7280] truncate">
                        {lastMsg?.content ?? "No messages"}
                      </p>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="px-4 py-8 text-sm text-[#6B7280] text-center">
                No conversations yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: message thread */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {selected.customer_name ?? selected.customer_number}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {selected.customer_number} · {selected.agent_type} agent
                </p>
              </div>
              <span
                className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                  selected.status === "escalated"
                    ? "bg-[#FEE2E2] text-[#991B1B]"
                    : selected.status === "resolved"
                    ? "bg-[#F3F4F6] text-[#6B7280]"
                    : "bg-[#D1FAE5] text-[#065F46]"
                }`}
              >
                {selected.status}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === "agent"
                        ? "bg-white border border-[#E5E7EB] text-[#111827]"
                        : "bg-[#6366F1] text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-2 text-xs text-[#6B7280] bg-[#F9FAFB] rounded-lg px-3 py-2">
                <span>⚠</span>
                <span>Read-only. Agents handle replies.</span>
                {!selected.manual_override && (
                  <button className="ml-auto text-[#6366F1] font-medium hover:underline">
                    Override &amp; reply manually
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[#6B7280]">
            Select a conversation
          </div>
        )}
      </div>
    </>
  );
}
