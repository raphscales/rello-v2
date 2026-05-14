import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase
    .from('businesses')
    .update({ google_calendar_token: null })
    .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '')

  redirect('/settings?gcal=disconnected')
}
