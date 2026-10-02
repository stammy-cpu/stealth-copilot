export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Supabase removed — profile is returned as JSON for in-memory use only.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { role_title, company_name, hourly_rate, system_prompt, cvText, jdText } = body

    const profile = {
      id:                    crypto.randomUUID(),
      role_title:            role_title    ?? 'Untitled Role',
      company_name:          company_name  ?? null,
      hourly_rate:           hourly_rate   ?? null,
      cv_raw_text:           cvText        ?? null,
      jd_raw_text:           jdText        ?? null,
      system_prompt:         system_prompt ?? null,
      vad_silence_threshold: 2.7,
      max_tokens:            380,
      temperature:           0.45,
      created_at:            new Date().toISOString(),
    }

    return NextResponse.json(profile)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to build profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
