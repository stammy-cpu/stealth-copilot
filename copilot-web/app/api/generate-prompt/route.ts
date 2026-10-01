export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const { cvText, jdText, roleTitle, company, rate } = await req.json()

    if (!jdText?.trim()) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 })
    }

    const systemPrompt = `You are an elite career coach and AI prompt engineer.
Your task: Analyse the candidate's CV/background and the job description, then generate a complete interview co-pilot configuration.

STRICT OUTPUT RULES:
1. Output ONLY valid JSON — no markdown fences, no commentary.
2. The system_prompt must sound 100% human and conversational. NEVER use: "leverage", "delve", "utilize", "furthermore", "crucial", "in conclusion", "tapestry", "key takeaway".
3. Anchor stories must map real CV experience to JD requirements — never fabricate.
4. system_prompt must be written in first person, ready to paste directly into an AI co-pilot overlay.`

    const userMessage = `
CANDIDATE CV / BACKGROUND:
${cvText || '(No CV provided — use generic CS/software background)'}

JOB DESCRIPTION:
${jdText}

ROLE: ${roleTitle || 'Unknown Role'}
COMPANY: ${company || 'Unknown Company'}
RATE: ${rate || 'Not specified'}

Generate a JSON object with EXACTLY these fields:
{
  "role_title": "string — the exact job title",
  "company_name": "string",
  "hourly_rate": "string",
  "anchor_stories": [
    "Story 1: [Topic] → [Project/Experience] (brief description)",
    "Story 2: ...",
    "Story 3: ...",
    "Story 4: ...",
    "Story 5: ..."
  ],
  "system_prompt": "Full system prompt string — 300-500 words. Must include: role context, candidate profile, 5 anchor stories, human cadence rules (banned buzzwords list), dynamic bullet scaling instructions, and content flow."
}

Return ONLY the JSON object.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    // Ensure anchor_stories is always an array of strings
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
