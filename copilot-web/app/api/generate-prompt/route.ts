export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, groqChatWithFallback } from '@/lib/groq'

const MAX_CV  = 2500
const MAX_JD  = 2000
const MAX_OUT = 3200   // was 1600 — system_prompt alone needs ~800 tokens

export async function POST(req: NextRequest) {
  try {
    const groq = makeGroqClient()
    const { cvText, jdText, roleTitle, company, rate } = await req.json()

    if (!jdText?.trim() && !roleTitle?.trim()) {
      return NextResponse.json({ error: 'Job description or role title is required' }, { status: 400 })
    }

    const hasRealCv      = (cvText?.trim().length ?? 0) > 40
    const hasRealCompany = (company?.trim().length ?? 0) > 1

    const cvSnippet = hasRealCv
      ? cvText.trim().slice(0, MAX_CV)
      : '(No CV — use "In a previous role…" style. Never invent company names.)'
    const jdSnippet = (jdText || '').trim().slice(0, MAX_JD)

    const system = `You are an elite interview coach AI.
Output ONLY a valid JSON object — no markdown fences, no extra text before or after.

RULES (never break):
- NEVER invent company names, project names, or metrics not in the CV.
- If no employer named, use: "In a previous role…" / "At a former employer…"
- BANNED words: leverage, delve, utilize, synergy, spearheaded, robust, furthermore, crucial.
- Sound 100% human. Use contractions. Vary sentence length.
- All anchor stories must follow STAR (Situation → Task → Action → Result).
- system_prompt must coach the AI overlay to adapt by QUESTION TYPE.`

    const user = `
ROLE: ${roleTitle || 'Not specified'}
COMPANY: ${hasRealCompany ? company : 'Undisclosed — never invent a name'}
RATE: ${rate || 'N/A'}

CV:
${cvSnippet}

JOB DESCRIPTION:
${jdSnippet}

Return ONLY this JSON object (no code fences):
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
  "tell_me_about_yourself": "60-90 sec polished answer. Current context, 2 key JD-matched strengths, why this role.",
  "tricky_answers": {
    "weakness": "Real weakness + active improvement. Never 'I work too hard'.",
    "failure": "STAR format. Honest setback + what changed after.",
    "salary": "Confident anchor. Non-defensive. Leaves room to negotiate."
  },
  "system_prompt": "200-250 words. Live AI overlay prompt. Include: candidate profile, role context, 3 anchor story hooks, format rules (must be 100% conversational prose, NEVER bullet points), tone (natural/confident), integrity rule (never invent companies — use vague refs), and routing: detect question TYPE and respond accordingly."
}`

    // NOTE: No response_format: json_object — that causes hard 400 on any truncation.
    // We parse manually and extract JSON from the text instead.
    const completion = await groqChatWithFallback(groq, {
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      max_tokens: MAX_OUT,
      temperature: 0.45,
      // response_format removed intentionally — strict JSON mode causes 400 on token limit
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    // Extract JSON — handle markdown fences if model adds them despite instructions
    let jsonStr = raw.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()

    // Find outermost { ... } in case of any leading/trailing text
    const braceStart = jsonStr.indexOf('{')
    const braceEnd   = jsonStr.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd !== -1) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1)
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // Last-resort safe fallback so the user can still proceed
      console.error('[generate-prompt] JSON parse failed. Raw:', raw.slice(0, 300))
      parsed = {
        role_title:           roleTitle || 'Interview Session',
        company_name:         company   || null,
        anchor_stories:       [],
        tell_me_about_yourself: '',
        tricky_answers:       { weakness: '', failure: '', salary: '' },
        system_prompt: `You are a helpful AI interview co-pilot assisting a candidate interviewing for ${roleTitle || 'a role'}${hasRealCompany ? ` at ${company}` : ''}. Answer questions naturally, concisely, and confidently. Use "in a previous role" when referencing past experience. Never invent facts.`,
      }
    }

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
