/**
 * Resolves the best available Groq chat model for this API key.
 * Tries models in priority order and returns the first one that responds.
 * Falls back gracefully rather than crashing.
 */

import Groq from 'groq-sdk'

// Priority order — most capable first, then fallbacks
const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
]

let _resolvedModel: string | null = null

export async function resolveGroqModel(groq: Groq): Promise<string> {
  if (_resolvedModel) return _resolvedModel

  for (const model of CANDIDATE_MODELS) {
    try {
      await groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      })
      _resolvedModel = model
      console.log(`[groq-model] Using: ${model}`)
      return model
    } catch {
      console.warn(`[groq-model] ${model} unavailable, trying next…`)
    }
  }

  throw new Error('No Groq chat model available. Check your API key and plan.')
}

export function makeGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey?.trim()) {
    throw new Error(
      'GROQ_API_KEY is not configured. Add it to your Vercel environment variables.',
    )
  }
  return new Groq({ apiKey })
}
