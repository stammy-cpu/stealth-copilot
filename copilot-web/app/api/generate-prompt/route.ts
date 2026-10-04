export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, resolveGroqModel } from '@/lib/groq'

// Hard caps to stay well under 8 000 TPM
const MAX_CV   = 2500
const MAX_JD   = 2000
const MAX_OUT  = 1600

export async function POST(req: NextRequest) {
  try {
    const groq  = makeGroqClient()
    const model = await resolveGroqModel(groq)

    const { cvText, jdText, roleTitle, company, rate } = await req.json()

    if (!jdText?.trim() && !roleTitle?.trim()) {
      return NextResponse.json({ error: 'Job description or role title is required' }, { status: 400 })
    }

    const hasRealCv      = (cvText?.trim().length ?? 0) > 40
    const hasRealCompany = (company?.trim().length ?? 0) > 1

    // ── Cap inputs ────────────────────────────────────────────────────────────
    const cvSnippet = hasRealCv
      ? cvText.trim().slice(0, MAX_CV)
      : '(No CV — use "In a previous role…" style. Never invent company names.)'

    const jdSnippet = (jdText || '').trim().slice(0, MAX_JD)

    // ── Prompt (kept intentionally short) ────────────────────────────────────
    const system = `You are an elite interview coach AI.
Output ONLY valid JSON — zero markdown, no extra text.

RULES (never break):
- NEVER invent company names, project names, or metrics not in the CV.
- If no employer is named, use: "In a previous role…" / "At a former employer…"
- BANNED words: leverage, delve, utilize, synergy, spearheaded, robust, furthermore, crucial, holistic, tapestry.
- Sound 100% human. Use contractions. Vary sentence length.
- All anchor stories must follow STAR (Situation → Task → Action → Result).
- system_prompt must coach the AI overlay to adapt by QUESTION TYPE, not just keywords.`

    const user = `
ROLE: ${roleTitle || 'Not specified'}
COMPANY: ${hasRealCompany ? company : 'Undisclosed — never invent a name'}
RATE: ${rate || 'N/A'}

CV:
${cvSnippet}

JOB DESCRIPTION:
${jdSnippet}

Return this exact JSON structure:
{
  "role_title": "string",
  "company_name": "string or null",
  "anchor_stories": [
    "TYPE: Problem-Solving | STAR summary (2-3 sentences, use 'previous role' if no employer)",
    "TYPE: Leadership | STAR summary",
    "TYPE: Technical Challenge | STAR summary",
    "TYPE: Handling Failure | STAR summary — honest, show growth",
    "TYPE: Why This Role | motivation-driven narrative"
  ],
  "tell_me_about_yourself": "60-90 sec polished answer. Current context → 2 key JD-matched strengths → why this role.",
  "tricky_answers": {
    "weakness": "Real weakness + active improvement. Never 'I work too hard'.",
    "failure": "STAR format. Honest setback + what changed after.",
    "salary": "Confident anchor. Non-defensive. Leaves room to negotiate."
  },
  "system_prompt": "400-500 words. Injected live into the AI overlay during the interview. Must include: (1) who the candidate is, (2) role context + what the interviewer cares about, (3) the 5 anchor stories in 1-sentence each, (4) format rules: bullets for technical, prose for behavioural, (5) tone: natural, confident, never robotic, (6) integrity rule: never invent specific companies or metrics, use vague references if needed, (7) routing: detect question TYPE and pick the right story or approach — don't keyword-match."
}`

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      max_tokens: MAX_OUT,
      temperature: 0.45,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed.anchor_stories)) {
      parsed.anchor_stories = Object.values(parsed.anchor_stories ?? {})
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[generate-prompt]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
