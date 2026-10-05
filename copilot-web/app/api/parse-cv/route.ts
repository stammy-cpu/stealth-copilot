export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfParse = (buf: Buffer, opts?: any) => Promise<{ text: string }>

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const fileName    = file.name.toLowerCase()
    let text          = ''

    if (fileName.endsWith('.pdf')) {
      try {
        // pdf-parse may be CJS or ESM depending on bundler — handle both shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import('pdf-parse') as any
        const pdfParse: PdfParse = mod.default ?? mod
        const result = await pdfParse(buffer)
        text = result.text || ''
      } catch (e) {
        console.error('[parse-cv] pdf-parse error:', e)
        return NextResponse.json(
          { error: 'Could not read PDF — try pasting your CV text instead.' },
          { status: 422 },
        )
      }
    } else if (fileName.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth')
        const result  = await mammoth.extractRawText({ buffer })
        text = result.value || ''
      } catch (e) {
        console.error('[parse-cv] mammoth error:', e)
        return NextResponse.json(
          { error: 'Could not read DOCX — try pasting your CV text instead.' },
          { status: 422 },
        )
      }
    } else if (fileName.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PDF, DOCX, or TXT — or paste your CV.' },
        { status: 415 },
      )
    }

    // Clean up whitespace artifacts common in PDF extraction
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n')
      .replace(/[ \t]{3,}/g, ' ')
      .trim()

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'CV text too short after extraction — try pasting your CV text instead.' },
        { status: 422 },
      )
    }

    return NextResponse.json({ text: text.slice(0, 12000) })
  } catch (err) {
    console.error('[parse-cv]', err)
    return NextResponse.json(
      { error: 'Failed to parse CV' },
      { status: 500 },
    )
  }
}
