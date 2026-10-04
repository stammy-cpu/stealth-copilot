/**
 * Groq client helpers.
 *
 * IMPORTANT: We no longer probe models with throwaway requests.
 * Probing wastes rate-limit budget and causes all real calls to fail when
 * the API key is on a low-TPM plan. Instead we use groqChatWithFallback
 * which tries models in priority order only on actual call failures.
 */

import Groq from 'groq-sdk'

// Priority order — most capable first.
const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
]

/**
 * Wraps a Groq chat completion call with automatic model fallback.
 * Tries each model in priority order until one succeeds.
 */
export async function groqChatWithFallback(
  groq: Groq,
  params: Omit<Parameters<Groq['chat']['completions']['create']>[0], 'model'>,
): Promise<Groq.Chat.ChatCompletion> {
  let lastErr: unknown
  for (const model of CANDIDATE_MODELS) {
    try {
      const result = await groq.chat.completions.create(
        { ...params, model } as Parameters<Groq['chat']['completions']['create']>[0],
      )
      return result as Groq.Chat.ChatCompletion
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      // Don't retry on non-model errors (auth, malformed request, etc.)
      if (
        !msg.includes('model') &&
        !msg.includes('rate') &&
        !msg.includes('capacity') &&
        !msg.includes('not found')
      ) {
        throw err
      }
      console.warn(`[groq] ${model} failed (${msg.slice(0, 80)}), trying next…`)
    }
  }
  throw lastErr
}

export function makeGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('GROQ_API_KEY is not set. Add it to your environment variables.')
  }
  return new Groq({ apiKey })
}
