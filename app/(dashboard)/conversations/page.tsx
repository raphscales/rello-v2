import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ConversationsPage() {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .single()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, customer_phone, customer_name, last_message_at, agent_type, is_overridden')
    .eq('business_id', business?.id)
    .order('last_message_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">All SMS threads handled by your agents</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {!conversations?.length ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No conversations yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {conversations.map(c => (
              <li key={c.id}>
                <Link
                  href={`/conversations/${c.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                      {(c.customer_name ?? c.customer_phone).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.customer_name ?? c.customer_phone}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {c.is_overridden
                          ? 'You replied'
                          : `${c.agent_type?.replace('_', ' ') ?? 'agent'} agent`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.is_overridden && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Override active
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(c.last_message_at).toLocaleDateString('en-NZ', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
