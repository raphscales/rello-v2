'use client'

import { useState, useTransition } from 'react'
import { inviteClient, switchToBusiness } from './actions'
import { ExternalLink, Mail, ArrowRight } from 'lucide-react'

interface Business {
  id: string
  name: string
  phone: string | null
  created_at: string
  bookingCount: number
  conversationCount: number
}

export default function AdminPanel({ businesses }: { businesses: Business[] }) {
  const [email, setEmail] = useState('')
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', email)
      const result = await inviteClient(fd)
      setInviteResult(result ?? { success: true })
      if (!result?.error) setEmail('')
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-lg">◈ rello</span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <p className="text-sm text-gray-500">{businesses.length} business{businesses.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* Invite client */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Invite new client</h2>
        </div>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
            required
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isPending || !email}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteResult?.success && (
          <p className="text-sm text-green-700 mt-2">✓ Invite sent. They'll receive a magic link to sign up.</p>
        )}
        {inviteResult?.error && (
          <p className="text-sm text-red-600 mt-2">Error: {inviteResult.error}</p>
        )}
      </section>

      {/* Business list */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All businesses</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {businesses.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No businesses yet.</div>
          ) : businesses.map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {b.phone ?? 'No phone'} · {b.conversationCount} conversations · {b.bookingCount} bookings
                </p>
                <p className="text-xs text-gray-300 font-mono mt-0.5">{b.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-NZ')}</span>
                <form action={switchToBusiness.bind(null, b.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
