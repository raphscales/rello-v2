'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { createBusiness } from './actions'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const TIMEZONES = [
  'Pacific/Auckland','Pacific/Chatham','Australia/Sydney','Australia/Melbourne',
  'Australia/Brisbane','Australia/Perth','Australia/Adelaide',
]

const DEFAULT_HOURS = { open: '09:00', close: '17:00' }
const DEFAULT_CLOSED: Record<string, boolean> = {
  monday: false, tuesday: false, wednesday: false,
  thursday: false, friday: false, saturday: true, sunday: true,
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(DEFAULT_CLOSED)

  // Form values
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('Pacific/Auckland')

  const steps = ['Business details', 'Trading hours', 'All set']

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('name', name)
    fd.set('phone', phone)
    fd.set('timezone', timezone)
    for (const day of DAYS) {
      fd.set(`hours_${day}_closed`, closed[day] ? 'true' : 'false')
    }
    startTransition(async () => {
      const result = await createBusiness(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="text-center mb-8">
        <span className="text-2xl font-bold text-indigo-600 tracking-tight">◈ rello</span>
        <p className="text-gray-500 text-sm mt-1">Let&apos;s set up your business</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
              i < step ? 'bg-indigo-600 text-white' :
              i === step ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          {/* Step 0: Business details */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Your business details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Auckland Plumbing Co."
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +64 9 123 4567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Trading hours */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Trading hours</h2>
                <p className="text-sm text-gray-500 mt-0.5">Your agents won&apos;t book outside these hours.</p>
              </div>
              <div className="space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="capitalize text-sm font-medium text-gray-700 w-24">{day}</span>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={closed[day]}
                        onChange={e => setClosed(c => ({ ...c, [day]: e.target.checked }))}
                        className="rounded"
                      />
                      Closed
                    </label>
                    {!closed[day] && (
                      <>
                        <input
                          type="time"
                          name={`hours_${day}_open`}
                          defaultValue={DEFAULT_HOURS.open}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                          type="time"
                          name={`hours_${day}_close`}
                          defaultValue={DEFAULT_HOURS.close}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">You&apos;re all set, {name}!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  We&apos;ve created your business and set up 3 AI agents — follow-up, booking, and rescheduling. They&apos;re ready to go.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                {['Follow-up Agent', 'Booking Agent', 'Rescheduling Agent'].map(a => (
                  <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          {step > 0 && step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < 1 && (
            <button
              type="button"
              onClick={() => { if (name.trim()) setStep(s => s + 1) }}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating your workspace…' : 'Go to dashboard →'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
