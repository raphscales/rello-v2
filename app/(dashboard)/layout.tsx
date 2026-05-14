import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  // No business yet — send to onboarding wizard
  if (!business) redirect('/onboarding')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar businessName={business.name} />
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  )
}
