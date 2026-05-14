'use client'

import { useState, useTransition } from 'react'
import { overrideAndReply, handBackToAgent } from '@/app/(dashboard)/conversations/[id]/actions'

interface Props {
  conversationId: string
  isOverridden: boolean
  hasClickSend: boolean
}

export default function OverrideReplyPanel({ conversationId, isOverridden, hasClickSend }: Props) {
  const [showInput, setShowInput] = useState(isOverridden)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!text.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await overrideAndReply(conversationId, text.trim())
        setText('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send')
      }
    })
  }

  function handleHandBack() {
    setError(null)
    startTransition(async () => {
      await handBackToAgent(conversationId)
      setShowInput(false)
    })
  }

  if (!hasClickSend) {
    return (
      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 text-center">
        <p className="text-sm text-gray-400">
          ClickSend number not configured — contact Rello to enable SMS replies
        </p>
      </div>
    )
  }

  if (!showInput) {
    return (
      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
        <p className="text-xs text-gray-400 text-center mb-3">
          Read-only — your agents are handling this conversation
        </p>
        <button
          onClick={() => setShowInput(true)}
          className="w-full text-sm font-medium text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-lg transition-colors"
        >
          Override &amp; reply manually
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 px-5 py-4">
      <p className="text-xs font-medium text-amber-600 mb-2">
        Override active — typing as you · agent is paused for this thread
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
        }}
        placeholder="Type your reply… (⌘Enter to send)"
        rows={3}
        autoFocus
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
      />
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleHandBack}
          disabled={isPending}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
          ← Hand back to agent
        </button>
        <button
          onClick={handleSend}
          disabled={isPending || !text.trim()}
          className="text-sm font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
