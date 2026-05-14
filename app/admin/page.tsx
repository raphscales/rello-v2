import { createClient } from '@/lib/supabase/server'

// Admin panel — Raphael only (guarded by middleware checking ADMIN_USER_ID)
export default async function AdminPage() {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone, created_at, owner_id')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-bold text-gray-900">Rello</span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full ml-1">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">All Businesses</h1>
          <p className="text-sm text-gray-500 mt-1">{businesses?.length ?? 0} total</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {(businesses ?? []).map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-NZ')}</p>
                <p className="text-xs font-mono text-gray-300 mt-0.5">{b.id}</p>
              </div>
            </div>
          ))}
          {!businesses?.length && (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No businesses yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
