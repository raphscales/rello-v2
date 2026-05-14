import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? ''

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('businesses')
      .update({ google_calendar_token: null })
      .eq('owner_id', user.id)
  }
  return NextResponse.redirect(`${BASE}/settings?gcal=disconnected`)
}
