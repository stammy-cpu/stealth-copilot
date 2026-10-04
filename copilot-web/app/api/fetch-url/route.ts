export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, resolveGroqModel } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // ── 1. Fetch the page HTML ─────────────────────────────────────────────────
    let rawHtml = ''
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      })
      rawHtml = await res.text()
    } catch (fetchErr) {
      console.warn('[fetch-url] Could not fetch page:', fetchErr)
    }

    // ── 2. Strip HTML to readable text ────────────────────────────────────────
    const plainText = rawHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .slice(0, 8000)

    // ── 3. AI extraction ──────────────────────────────────────────────────────
    const groq  = makeGroqClient()
    const model = await resolveGroqModel(groq)

    const systemMsg = `You are a job description parser. Extract structured information from the text provided.
Return ONLY valid JSON with exactly these fields — no markdown, no explanation:
{
  "job_title": "string",
  "company_name": "string",
  "location": "string or null",
  "employment_type": "string or null (e.g. Full-time, Contract, Remote)",
  "salary_range": "string or null",
  "key_requirements": ["string", "string", "..."],
  "nice_to_have": ["string", "..."],
  "responsibilities": ["string", "..."],
  "tech_stack": ["string", "..."],
  "job_description_summary": "string — 2-3 sentence plain English summary of the role",
  "key_focus_areas": "string — comma-separated key topics for interview prep"
}
If any field is not found, use null or an empty array. Never fabricate information.`

    const userMsg = plainText.trim()
      ? `URL: ${url}\n\nPAGE CONTENT:\n${plainText}`
      : `URL: ${url}\n\nNo page content could be fetched (the site may block bots). Use the URL itself to infer what you can about the role and company.`

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: userMsg },
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse URL'
    console.error('[fetch-url]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
