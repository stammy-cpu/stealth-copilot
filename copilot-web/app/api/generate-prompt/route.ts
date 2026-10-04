export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, resolveGroqModel } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const groq  = makeGroqClient()
    const model = await resolveGroqModel(groq)

    const { cvText, jdText, roleTitle, company, rate } = await req.json()

    if (!jdText?.trim() && !roleTitle?.trim()) {
      return NextResponse.json({ error: 'Job description or role title is required' }, { status: 400 })
    }

    // ─── Detect whether the candidate provided real employer names ───────────
    // If cvText is empty or generic, flag it so the prompt can handle it gracefully
    const hasRealCv      = !!cvText?.trim()
    const hasRealCompany = !!company?.trim()

    const systemPrompt = `You are an elite AI interview coach with deep expertise in:
- Behavioural interviews (STAR method: Situation, Task, Action, Result)
- Technical interviews (system design, algorithms, architecture)
- Competency-based interviews (leadership, problem-solving, communication)
- Senior and executive-level interview preparation
- Managing tricky questions: gaps, failures, salary, "tell me about yourself"

Your task is to generate a complete, production-ready interview co-pilot configuration.

═══════ STRICT RULES ═══════

HONESTY RULES (critical — never break these):
1. NEVER fabricate specific company names, project names, or technologies the candidate hasn't mentioned.
2. If the candidate's CV is empty or vague, use confident but general language:
   - ✓ "In a previous role..." / "At a former employer..." / "This reminds me of a challenge I tackled previously..."
   - ✓ "In one of my past positions, we faced a similar situation..."
   - ✗ NEVER say "At Google..." or "At Accenture..." unless the CV explicitly states it.
3. Never invent metrics (e.g. "improved performance by 40%") unless the CV states them.
4. If no real experience is given, frame answers as: "My approach to this would be..." or "In theory and from what I've studied..."

LANGUAGE RULES:
5. Sound 100% human — natural, confident, conversational. Zero corporate buzzwords.
6. BANNED words: leverage, delve, utilize, furthermore, crucial, in conclusion, tapestry, synergy, holistic, robust, spearheaded, orchestrated.
7. Use contractions (I've, I'd, we'd). Speak how a smart human talks in an interview.
8. Vary sentence length. Short punchy sentences for impact. Longer ones for context.

INTERVIEW INTELLIGENCE RULES:
9. Anchor stories MUST follow STAR format internally (Situation → Task → Action → Result) even if not labelled.
10. Every story should end with a transferable lesson or quantifiable outcome when possible.
11. Stories should be versatile — applicable to multiple question types (teamwork, leadership, technical, failure, success).
12. Include natural pivots for uncomfortable questions (gaps, weaknesses, failures).
13. The system_prompt must coach the AI to listen for question TYPE and respond accordingly — not just keywords.
14. Prepare the co-pilot to handle: "Tell me about yourself", "Why this role?", "Biggest weakness?", "Where do you see yourself in 5 years?", "Tell me about a time you failed", "Walk me through your background".

OUTPUT FORMAT:
Return ONLY valid JSON — no markdown fences, no commentary, no trailing text.`

    const userMessage = `
CANDIDATE CV / BACKGROUND:
${hasRealCv ? cvText : '(Candidate has not provided a CV. Build the profile to be versatile and draw on the job description context. Use phrases like "in a previous role" or "from my background" — never invent company names or metrics.)'}

JOB DESCRIPTION / ROLE CONTEXT:
${jdText || `Role: ${roleTitle} at ${hasRealCompany ? company : 'a target company'}`}

TARGET ROLE: ${roleTitle || 'Not specified'}
TARGET COMPANY: ${hasRealCompany ? company : 'Not specified — do not invent a company name in stories'}
RATE / SENIORITY: ${rate || 'Not specified'}

════ WHAT TO GENERATE ════

Return a JSON object with EXACTLY these fields:

{
  "role_title": "string — exact job title from JD or roleTitle",
  "company_name": "${hasRealCompany ? company : 'Not specified'}",
  "hourly_rate": "${rate || 'Not specified'}",

  "candidate_profile_summary": "string — 2-3 sentence honest summary of who this candidate is based on their CV. If no CV, write a versatile placeholder that sounds natural.",

  "anchor_stories": [
    "STORY 1 — [Question Type: e.g. Problem-Solving] → [SITUATION: Brief context] → [TASK: What they needed to do] → [ACTION: Specific steps taken, using 'In a previous role...' if no employer named] → [RESULT: Outcome or learning]",
    "STORY 2 — [Question Type: Leadership/Teamwork] → ...",
    "STORY 3 — [Question Type: Technical Challenge] → ...",
    "STORY 4 — [Question Type: Handling Failure/Setback] → ...",
    "STORY 5 — [Question Type: Why This Role / Motivation] → ..."
  ],

  "interview_playbook": {
    "tell_me_about_yourself": "string — a 60-90 second polished answer tailored to this role. Starts with current/most recent context, highlights 2 key strengths relevant to the JD, ends with why this specific role.",
    "why_this_role": "string — genuine-sounding answer that ties the JD requirements to the candidate's trajectory.",
    "biggest_weakness": "string — a real weakness framed with self-awareness + active improvement. Never 'I work too hard'.",
    "biggest_strength": "string — most relevant strength to this JD with a concrete example attached.",
    "salary_question": "string — confident, non-defensive response that anchors high without being rigid.",
    "failure_question": "string — STAR-format answer about a real or plausible setback with honest reflection and growth."
  },

  "question_type_routing": {
    "technical": "string — instruction for how the AI co-pilot should handle technical questions (algorithms, system design, code): depth level, format, when to ask clarifying questions.",
    "behavioural": "string — instruction for behavioural questions: always use STAR, draw from anchor stories, keep answers under 2 minutes.",
    "motivation": "string — instruction for motivation/culture fit questions: tie to company mission, personal growth, specific role appeal.",
    "curveball": "string — instruction for unexpected or trick questions: pause, reframe positively, stay calm, admit uncertainty honestly."
  },

  "system_prompt": "string — 400-600 words. This is the FULL system prompt that will be injected into the live AI overlay during the interview. It must include:
    1. WHO the candidate is (from CV, or versatile placeholder)
    2. THE ROLE context and what the interviewer likely cares about
    3. THE 5 anchor stories in brief form (2-3 sentences each, STAR compressed)
    4. RESPONSE FORMAT RULES: use bullet points for technical answers, prose for behavioural, always end with a question or reflection
    5. TONE RULES: natural, confident, never robotic. Vary length — short for simple questions, detailed for complex ones
    6. INTEGRITY RULES: never make up specific companies/metrics. Use 'In a previous role...' if needed
    7. REAL-TIME ADAPTATION: read the question type from context, pick the best story or approach, don't just pattern-match keywords"
}

Return ONLY the JSON object. No extra text.`

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: 3000,
      temperature: 0.45,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    // Normalise anchor_stories to array
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
