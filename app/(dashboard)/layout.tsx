import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Sidebar from '@/components/dashboard/Sidebar'
import { clearAdminView } from '@/app/admin/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.id === process.env.ADMIN_USER_ID
  const cookieStore = await cookies()
  const adminViewId = isAdmin ? cookieStore.get('rello_admin_view')?.value : undefined

  let business: { id: string; name: string } | null = null

  if (adminViewId) {
    const service = createServiceClient()
    const { data } = await service
      .from('businesses')
      .select('id, name')
      .eq('id', adminViewId)
      .single()
    business = data
  } else {
    const { data } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    business = data
  }

  if (!business) {
    if (isAdmin) redirect('/admin')
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar businessName={business!.name} isAdminView={!!adminViewId} />
      <main className="flex-1 min-w-0 p-8">
        {adminViewId && (
          <div className="mb-6 flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-amber-800 font-medium">
              Viewing as: <strong>{business!.name}</strong>
            </span>
            <form action={clearAdminView}>
              <button type="submit" className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline">
                Exit view
              </button>
            </form>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
