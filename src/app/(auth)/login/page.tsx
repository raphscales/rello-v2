"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const isAdmin = data.user?.user_metadata?.role === "admin";
    router.push(isAdmin ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8">
        <div className="mb-6">
          <span className="text-[#6366F1] font-bold text-xl tracking-tight">◈ rello</span>
        </div>
        <h2 className="text-lg font-semibold text-[#111827] mb-1">Welcome back</h2>
        <p className="text-sm text-[#6B7280] mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6366F1] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <a href="#" className="text-[#6366F1] hover:underline">
            Forgot password?
          </a>
        </p>
      </div>
    </div>
  );
}
