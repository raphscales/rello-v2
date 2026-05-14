'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function switchToBusiness(businessId: string) {
  const cookieStore = await cookies()
  cookieStore.set('rello_admin_view', businessId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  redirect('/')
}

export async function clearAdminView() {
  const cookieStore = await cookies()
  cookieStore.delete('rello_admin_view')
  redirect('/admin')
}

export async function inviteClient(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required' }

  const supabase = createServiceClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rello-v2.vercel.app'}/auth/callback`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
