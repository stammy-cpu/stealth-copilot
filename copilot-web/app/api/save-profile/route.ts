export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      user_id,
      role_title,
      company_name,
      hourly_rate,
      system_prompt,
      cvText,
      jdText,
      anchor_stories,
      vad_silence_threshold = 2.2,
      max_tokens = 380,
      temperature = 0.45,
    } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // ── 1. Insert the interview profile ───────────────────────────────────────
    const { data: profile, error: insertErr } = await supabase
      .from('interview_profiles')
      .insert({
        user_id,
        role_title:            role_title    ?? 'Untitled Role',
        company_name:          company_name  ?? null,
        hourly_rate:           hourly_rate   ?? null,
        cv_raw_text:           cvText        ?? null,
        jd_raw_text:           jdText        ?? null,
        system_prompt:         system_prompt ?? null,
        anchor_stories:        anchor_stories ?? [],
        vad_silence_threshold,
        max_tokens,
        temperature,
        created_at:            new Date().toISOString(),
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[save-profile] insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // ── 2. Upsert active_sessions to point to this profile ────────────────────
    const { error: sessionErr } = await supabase
      .from('active_sessions')
      .upsert(
        { user_id, active_profile_id: profile.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (sessionErr) {
      console.error('[save-profile] session upsert error:', sessionErr)
      // Non-fatal — profile was still saved
    }

    return NextResponse.json({ ok: true, profile_id: profile.id, profile })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save profile'
    console.error('[save-profile]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
