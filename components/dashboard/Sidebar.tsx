'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, MessageSquare, CalendarDays, Bot, Settings, LogOut } from 'lucide-react'

const nav = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/bookings',      label: 'Bookings',      icon: CalendarDays },
  { href: '/agents',        label: 'Agents',        icon: Bot },
]

export default function Sidebar({ businessName, isAdminView }: { businessName: string; isAdminView?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200">
        <span className="text-indigo-600 font-bold text-lg tracking-tight">◈ rello</span>
        <p className="text-xs text-gray-400 mt-1 truncate">{businessName}</p>
        {isAdminView && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">Admin view</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-600 border-l-2 border-indigo-600 -ml-px'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + Sign out */}
      <div className="px-3 pb-4 border-t border-gray-200 pt-3 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === '/settings'
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
