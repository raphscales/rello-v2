import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { exchangeCode } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    redirect('/settings?gcal=error')
  }

  const tokens = await exchangeCode(code)

  const supabase = await createClient()
  await supabase
    .from('businesses')
    .update({ google_calendar_token: tokens })
    .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '')

  redirect('/settings?gcal=connected')
}
