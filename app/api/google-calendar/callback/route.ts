import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? ''

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${BASE}/settings?gcal=error`)
  }

  try {
    const tokens = await exchangeCode(code)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${BASE}/login`)
    }

    const { error: dbError } = await supabase
      .from('businesses')
      .update({ google_calendar_token: tokens })
      .eq('owner_id', user.id)

    if (dbError) {
      console.error('[gcal] DB update error:', dbError)
      return NextResponse.redirect(`${BASE}/settings?gcal=error`)
    }

    return NextResponse.redirect(`${BASE}/settings?gcal=connected`)
  } catch (err) {
    console.error('[gcal] callback error:', err)
    return NextResponse.redirect(`${BASE}/settings?gcal=error`)
  }
}
