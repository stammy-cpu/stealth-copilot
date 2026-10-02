// Local in-memory profile type — no database fields
export type InterviewProfile = {
  id: string
  role_title: string
  company_name: string | null
  hourly_rate: string | null
  cv_raw_text: string | null
  jd_raw_text: string | null
  system_prompt: string | null
  vad_silence_threshold: number
  max_tokens: number
  temperature: number
  created_at: string
}
