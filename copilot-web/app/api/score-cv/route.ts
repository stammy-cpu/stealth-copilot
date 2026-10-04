export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, groqChatWithFallback } from '@/lib/groq'

const MAX_CV = 2500
const MAX_JD = 2000

export async function POST(req: NextRequest) {
  try {
    const { cvText, jdText, jobRole, companyName } = await req.json()

    if (!jdText?.trim() && !jobRole?.trim()) {
      return NextResponse.json({ error: 'Job description or role required' }, { status: 400 })
    }

    const groq = makeGroqClient()

    const cvSnippet = (cvText?.trim() || '').slice(0, MAX_CV) || '(No CV provided)'
    const jdSnippet = (jdText?.trim() || `Role: ${jobRole || 'Unknown'} at ${companyName || 'Unknown company'}`).slice(0, MAX_JD)

    const systemMsg = `You are an expert ATS and career coach AI.
Analyse the candidate CV against the job description and return ONLY valid JSON — no markdown, no explanation.

SCORING RULES:
- Be HONEST. A score above 80 only for genuinely strong matches.
- If no CV provided, baseline 30-40, note missing CV as a critical gap.
- Base ALL gaps on actual missing skills/keywords from the JD — never generic advice.
- quick_wins must be hyper-specific (e.g. "Add 'Docker' to your Skills section" not "improve your resume").`

    const userMsg = `CV:\n${cvSnippet}\n\nJOB DESCRIPTION:\n${jdSnippet}\n\nROLE: ${jobRole || 'Not specified'}\nCOMPANY: ${companyName || 'Not specified'}\n\nReturn JSON:\n{\n  "overall_score": <integer 0-100>,\n  "score_breakdown": { "skills_match": <0-100>, "experience_relevance": <0-100>, "keyword_coverage": <0-100>, "seniority_alignment": <0-100> },\n  "strengths": ["string"],\n  "critical_gaps": [{ "gap": "string", "severity": "high|medium|low", "recommendation": "string" }],\n  "missing_keywords": ["string"],\n  "ats_verdict": "1-2 sentence honest verdict",\n  "quick_wins": ["specific actionable string"]\n}`

    const completion = await groqChatWithFallback(groq, {
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: userMsg },
      ],
      max_tokens: 1200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)

    if (typeof result.overall_score !== 'number') result.overall_score = 40
    result.overall_score = Math.max(0, Math.min(100, Math.round(result.overall_score)))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scoring failed'
    console.error('[score-cv]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
