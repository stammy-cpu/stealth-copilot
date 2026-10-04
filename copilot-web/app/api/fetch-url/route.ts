export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { makeGroqClient, groqChatWithFallback } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // ── Fetch page HTML ───────────────────────────────────────────────────────
    let plainText = ''
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      })
      const html = await res.text()
      plainText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .slice(0, 7000)
    } catch (e) {
      console.warn('[fetch-url] page fetch failed:', e)
    }

    const groq = makeGroqClient()

    const systemMsg = `You are a job description parser. Extract structured info from the page content.
Return ONLY valid JSON with exactly these fields — no markdown:
{ "job_title": "string", "company_name": "string", "location": "string|null", "employment_type": "string|null", "salary_range": "string|null", "key_requirements": ["string"], "nice_to_have": ["string"], "responsibilities": ["string"], "tech_stack": ["string"], "job_description_summary": "string — 2-3 plain English sentences", "key_focus_areas": "comma-separated interview prep topics" }
Use null or [] for missing fields. Never fabricate.`

    const userMsg = plainText.trim()
      ? `URL: ${url}\n\nPAGE:\n${plainText}`
      : `URL: ${url}\n\n(Page could not be fetched — infer what you can from the URL itself.)`

    const completion = await groqChatWithFallback(groq, {
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: userMsg },
      ],
      max_tokens: 900,
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
