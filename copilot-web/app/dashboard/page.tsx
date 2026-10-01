export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { InterviewProfile, ActiveSession } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: session }, { data: profiles }] = await Promise.all([
    supabase.from('active_sessions').select('*').eq('user_id', user!.id).single(),
    supabase.from('interview_profiles').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
  ])

  const activeProfile = profiles?.find((p: InterviewProfile) => p.id === session?.active_profile_id) ?? null

  return (
    <DashboardClient
      userId={user!.id}
      initialSession={session as ActiveSession | null}
      initialProfiles={(profiles ?? []) as InterviewProfile[]}
      activeProfile={activeProfile}
    />
  )
}
