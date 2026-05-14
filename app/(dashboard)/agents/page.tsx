import { createClient } from '@/lib/supabase/server'
import AgentCard from '@/components/dashboard/AgentCard'

export default async function AgentsPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .single()

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('business_id', business?.id)
    .order('type')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your AI team — each agent handles a specific part of the customer journey</p>
      </div>

      <div className="space-y-4">
        {(agents ?? []).map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}

        {!agents?.length && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">
            No agents found. Contact Rello to set up your agents.
          </div>
        )}
      </div>
    </div>
  )
}
