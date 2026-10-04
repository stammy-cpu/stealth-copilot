export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, resolveGroqModel } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { cvText, jdText, jobRole, companyName } = await req.json()

    if (!jdText?.trim() && !jobRole?.trim()) {
      return NextResponse.json({ error: 'Job description or role required' }, { status: 400 })
    }

    const groq  = makeGroqClient()
    const model = await resolveGroqModel(groq)

    const systemMsg = `You are an expert career coach and ATS (Applicant Tracking System) specialist.
Analyse the candidate's CV/resume against the job description and produce a detailed, honest assessment.
Return ONLY valid JSON — no markdown fences, no explanation.`

    const userMsg = `CANDIDATE CV / BACKGROUND:
${cvText?.trim() || '(No CV uploaded — the candidate has not provided their resume yet)'}

JOB DESCRIPTION / ROLE CONTEXT:
${jdText?.trim() || `Role: ${jobRole || 'Software Engineer'} at ${companyName || 'Target Company'}`}

TARGET ROLE: ${jobRole || 'Not specified'}
COMPANY: ${companyName || 'Not specified'}

Generate a JSON object with EXACTLY these fields:
{
  "overall_score": <integer 0-100 — honest ATS match score based on CV vs JD alignment>,
  "score_breakdown": {
    "skills_match": <integer 0-100>,
    "experience_relevance": <integer 0-100>,
    "keyword_coverage": <integer 0-100>,
    "seniority_alignment": <integer 0-100>
  },
  "strengths": ["string", "..."],
  "critical_gaps": [
    {
      "gap": "string — what is missing",
      "severity": "high | medium | low",
      "recommendation": "string — specific action to address this gap"
    }
  ],
  "missing_keywords": ["string", "..."],
  "ats_verdict": "string — 1-2 sentence overall verdict on fit",
  "quick_wins": ["string — specific things candidate can do right now to improve chances", "..."]
}

SCORING RULES:
- If no CV is provided, give a conservative baseline score of 30-45 and note the missing CV in critical_gaps.
- Be honest and specific — do not flatter. A score above 80 should be rare and only for strong matches.
- Base gaps on actual missing skills, experience, or keywords from the JD.
- quick_wins must be actionable (e.g. "Add 'Kubernetes' to your skills section", not "improve your resume").

Return ONLY the JSON object.`

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: userMsg },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)

    if (typeof result.overall_score !== 'number') {
      result.overall_score = 35
    }
    result.overall_score = Math.max(0, Math.min(100, Math.round(result.overall_score)))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scoring failed'
    console.error('[score-cv]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
