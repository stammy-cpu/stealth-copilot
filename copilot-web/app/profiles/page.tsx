export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfilesClient from './ProfilesClient'
import type { InterviewProfile, ActiveSession } from '@/lib/types'
import Sidebar from '@/components/Sidebar'

export default async function ProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profiles }, { data: session }] = await Promise.all([
    supabase.from('interview_profiles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('active_sessions').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#080b11' }}>
      <Sidebar userEmail={user.email} />
      <main className="flex-1 ml-60 p-8">
        <ProfilesClient
          userId={user.id}
          initialProfiles={(profiles ?? []) as InterviewProfile[]}
          initialSession={session as ActiveSession | null}
        />
      </main>
    </div>
  )
}
