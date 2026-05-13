import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import type { Business } from "@/types";

type AgentKey = "followup" | "booking" | "rescheduling";

const agentConfig: { key: AgentKey }[] = [
  { key: "followup" },
  { key: "booking" },
  { key: "rescheduling" },
];

export default async function AgentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .single() as { data: Business | null };

  if (!business) {
    return (
      <>
        <Topbar title="Agents" />
        <div className="flex-1 flex items-center justify-center text-sm text-[#6B7280]">
          No business configured.{" "}
          <a href="/settings" className="text-[#6366F1] ml-1 hover:underline">
            Set up your business →
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Agents" businessName={business.name} />
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {agentConfig.map(({ key }) => {
          const enabled = business[`${key}_enabled` as keyof Business] as boolean;
          const name = business[`${key}_name` as keyof Business] as string;
          const brief = business[`${key}_brief` as keyof Business] as string;

          return (
            <div key={key} className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${enabled ? "text-[#10B981]" : "text-[#D1D5DB]"}`}>●</span>
                  <p className="text-sm font-semibold text-[#111827]">{name}</p>
                </div>
                <form action={`/api/agents`} method="POST">
                  <input type="hidden" name="business_id" value={business.id} />
                  <input type="hidden" name="agent" value={key} />
                  <input type="hidden" name="field" value={`${key}_enabled`} />
                  <input type="hidden" name="value" value={enabled ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      enabled ? "bg-[#6366F1]" : "bg-[#D1D5DB]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </form>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                    Name
                  </label>
                  <p className="text-sm text-[#111827] border border-[#E5E7EB] rounded-md px-3 py-2 bg-[#F9FAFB]">
                    {name}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                    Brief
                  </label>
                  <p className="text-sm text-[#374151] border border-[#E5E7EB] rounded-md px-3 py-3 bg-[#F9FAFB] whitespace-pre-wrap leading-relaxed">
                    {brief}
                  </p>
                </div>
                <div className="flex justify-end">
                  <a
                    href={`/settings?section=agents&agent=${key}`}
                    className="text-xs text-[#6366F1] hover:underline"
                  >
                    Edit in Settings →
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
