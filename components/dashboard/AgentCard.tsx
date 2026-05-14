'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agent, AgentType } from '@/lib/types'

const agentDescriptions: Record<string, string> = {
  follow_up:    'Responds to missed calls within 60s',
  booking:      'Handles appointment scheduling',
  rescheduling: 'Manages changes and cancellations',
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const RATE_LIMIT = 3
const getRateLimitKey = (agentId: string) => `rello_test_${agentId}_${new Date().toDateString()}`

function getRemainingTests(agentId: string): number {
  if (typeof window === 'undefined') return RATE_LIMIT
  const used = parseInt(localStorage.getItem(getRateLimitKey(agentId)) ?? '0', 10)
  return Math.max(0, RATE_LIMIT - used)
}

function incrementTestCount(agentId: string) {
  const key = getRateLimitKey(agentId)
  const used = parseInt(localStorage.getItem(key) ?? '0', 10)
  localStorage.setItem(key, String(used + 1))
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const [isActive, setIsActive] = useState(agent.is_active)
  const [name, setName] = useState(agent.name)
  const [brief, setBrief] = useState(agent.brief)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Test modal state
  const [testOpen, setTestOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [testInput, setTestInput] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(RATE_LIMIT)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const description = agentDescriptions[agent.type] ?? ''

  useEffect(() => {
    if (testOpen) setRemaining(getRemainingTests(agent.id))
  }, [testOpen, agent.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, testLoading])

  async function toggleActive() {
    const newVal = !isActive
    setIsActive(newVal)
    await supabase.from('agents').update({ is_active: newVal }).eq('id', agent.id)
  }

  async function saveBrief() {
    setSaving(true)
    await supabase.from('agents').update({ name, brief }).eq('id', agent.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function sendTestMessage() {
    if (!testInput.trim() || testLoading || remaining <= 0) return
    setTestError(null)

    const userMsg: ChatMessage = { role: 'user', content: testInput.trim() }
    const updatedHistory = [...chatHistory, userMsg]
    setChatHistory(updatedHistory)
    setTestInput('')
    setTestLoading(true)

    try {
      const res = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          agentType: agent.type as AgentType,
          message: userMsg.content,
          history: chatHistory, // history before this message
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Agent failed')

      const newRemaining = remaining - 1
      incrementTestCount(agent.id)
      setRemaining(newRemaining)
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Something went wrong')
      setChatHistory(prev => prev.slice(0, -1)) // remove the user message on failure
    } finally {
      setTestLoading(false)
    }
  }

  function openTest() {
    setChatHistory([])
    setTestInput('')
    setTestError(null)
    setTestOpen(true)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-0 py-0.5 w-full transition-colors"
            />
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          {/* Toggle */}
          <button
            onClick={toggleActive}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Agent brief
            <span className="ml-1 font-normal text-gray-400">(write this like you&apos;re briefing a staff member)</span>
          </label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g. You are the follow-up agent for Auckland HVAC. When someone misses a call, text them within 60 seconds..."
          />
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={openTest}
              className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Test agent →
            </button>
            <button
              onClick={saveBrief}
              disabled={saving || (brief === agent.brief && name === agent.name)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save brief'}
            </button>
          </div>
        </div>
      </div>

      {/* Test agent modal */}
      {testOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Test — {name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real AI · {remaining} test{remaining !== 1 ? 's' : ''} remaining today
                </p>
              </div>
              <button
                onClick={() => setTestOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">
                  Send a message to see how this agent responds using your brief.
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-gray-100 text-gray-900 rounded-tr-sm'
                      : 'bg-indigo-600 text-white rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-indigo-100 text-indigo-600 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm">
                    Thinking…
                  </div>
                </div>
              )}
              {testError && (
                <p className="text-center text-xs text-red-500">{testError}</p>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-4">
              {remaining <= 0 ? (
                <p className="text-center text-xs text-gray-400">
                  Daily test limit reached — resets tomorrow
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendTestMessage() }}
                    placeholder="Type a customer message…"
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendTestMessage}
                    disabled={!testInput.trim() || testLoading}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
