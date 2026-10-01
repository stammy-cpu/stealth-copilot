export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      userId, cvText, jdText,
      role_title, company_name, hourly_rate, system_prompt,
    } = body

    if (userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('interview_profiles')
      .insert({
        user_id:               user.id,
        role_title:            role_title ?? 'Untitled Role',
        company_name:          company_name ?? null,
        hourly_rate:           hourly_rate ?? null,
        cv_raw_text:           cvText ?? null,
        jd_raw_text:           jdText ?? null,
        system_prompt:         system_prompt ?? null,
        vad_silence_threshold: 2.7,
        max_tokens:            380,
        temperature:           0.45,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed'
    console.error('[save-profile]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
