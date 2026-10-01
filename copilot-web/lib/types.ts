export type InterviewProfile = {
  id: string
  user_id: string
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

export type ActiveSession = {
  user_id: string
  active_profile_id: string | null
  is_desktop_connected: boolean
  updated_at: string
}
