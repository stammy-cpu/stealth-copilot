export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GenerateClient from './GenerateClient'
import Sidebar from '@/components/Sidebar'

export default async function GeneratePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#080b11' }}>
      <Sidebar userEmail={user.email} />
      <main className="flex-1 ml-60 p-8">
        <GenerateClient userId={user.id} />
      </main>
    </div>
  )
}
