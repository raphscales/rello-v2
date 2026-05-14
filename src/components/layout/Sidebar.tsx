"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  BarChart2,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/agents", label: "Agents", icon: Bot },
];

export function Sidebar({ userInitials }: { userInitials: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E5E7EB]">
        <span className="text-[#6366F1] font-bold text-lg tracking-tight">◈ rello</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-[#EEF2FF] text-[#6366F1] border-l-2 border-[#6366F1] ml-[-1px]"
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-[#E5E7EB] pt-3">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-[#EEF2FF] text-[#6366F1]"
              : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
          )}
        >
          <Settings size={16} />
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors w-full"
        >
          <div className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {userInitials}
          </div>
          <LogOut size={14} className="ml-auto" />
        </button>
      </div>
    </aside>
  );
}
