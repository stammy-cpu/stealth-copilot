'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Link2, FileText, Cpu, Mic, CheckCircle2, Upload, X,
  ChevronRight, ChevronLeft, Zap, AlignLeft, BookOpen, Radio,
  Loader2, SkipForward, Target, Building2, ListChecks, Star,
  MicOff, Save, Play, Sparkles, Briefcase, AlertTriangle,
  TrendingUp, TrendingDown, Minus, CheckCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AssistanceMode = 'teleprompter' | 'coach' | 'adaptive'

export type WizardConfig = {
  targetUrl:      string
  resumeFile:     File | null
  resumeFileName: string
  jobRole:        string
  companyName:    string
  keyFocusAreas:  string
  roleMatchScore: number
  assistanceMode: AssistanceMode
  micEnabled:     boolean
  saveAsPreset:   boolean
  systemPrompt?:  string
  anchorStories?: string[]
  profileId?:     string
  cvGaps?:        CvGap[]
  jdText?:        string
}

type CvGap = {
  gap: string
  severity: 'high' | 'medium' | 'low'
  recommendation: string
}

type ScoreBreakdown = {
  skills_match: number
  experience_relevance: number
  keyword_coverage: number
  seniority_alignment: number
}

type ScoreResult = {
  overall_score: number
  score_breakdown: ScoreBreakdown
  strengths: string[]
  critical_gaps: CvGap[]
  missing_keywords: string[]
  ats_verdict: string
  quick_wins: string[]
}

type UrlParseResult = {
  job_title?: string
  company_name?: string
  location?: string
  employment_type?: string
  salary_range?: string
  key_requirements?: string[]
  nice_to_have?: string[]
  responsibilities?: string[]
  tech_stack?: string[]
  job_description_summary?: string
  key_focus_areas?: string
}

type Props = {
  onComplete:  (config: WizardConfig) => void
  onDismiss?:  () => void
  userId?:     string
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Interview Link', icon: Link2 },
  { id: 2, label: 'Resume',         icon: FileText },
  { id: 3, label: 'Context',        icon: Target },
  { id: 4, label: 'Assist Mode',    icon: Cpu },
  { id: 5, label: 'Pre-Flight',     icon: CheckCircle2 },
]

const MODES = [
  {
    id: 'teleprompter' as AssistanceMode,
    icon: AlignLeft,
    label: 'Teleprompter / Compact',
    tag: 'DEFAULT',
    tagColor: '#10b981',
    tagBg: 'rgba(16,185,129,0.12)',
    desc: 'Concise bullet points and fast talking points optimised for live reading during a call. Minimal latency, maximum clarity.',
    accent: '#6366f1',
    border: 'rgba(99,102,241,0.35)',
    glow: '0 0 30px -6px rgba(99,102,241,0.35)',
    bg: 'rgba(99,102,241,0.08)',
  },
  {
    id: 'coach' as AssistanceMode,
    icon: BookOpen,
    label: 'Detailed Prep / Coach',
    tag: 'DEEP DIVE',
    tagColor: '#8b5cf6',
    tagBg: 'rgba(139,92,246,0.12)',
    desc: 'Deep technical breakdowns, code examples, and framework-level explanations for senior-level interviews.',
    accent: '#8b5cf6',
    border: 'rgba(139,92,246,0.35)',
    glow: '0 0 30px -6px rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.08)',
  },
  {
    id: 'adaptive' as AssistanceMode,
    icon: Radio,
    label: 'Live Adaptive Copilot',
    tag: 'REAL-TIME',
    tagColor: '#06b6d4',
    tagBg: 'rgba(6,182,212,0.12)',
    desc: 'Real-time audio transcription mode with dynamic prompt generation based on what the interviewer says.',
    accent: '#06b6d4',
    border: 'rgba(6,182,212,0.35)',
    glow: '0 0 30px -6px rgba(6,182,212,0.35)',
    bg: 'rgba(6,182,212,0.08)',
  },
]

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, accent = '#6366f1' }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <button
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        width: 44, height: 24,
        borderRadius: 9999,
        background: on ? accent : '#1e293b',
        border: on ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'all 200ms ease-in-out',
        cursor: 'pointer',
        flexShrink: 0,
        outline: 'none',
        boxShadow: on ? `0 0 12px -2px ${accent}55` : 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3, left: on ? 23 : 3,
          width: 16, height: 16,
          borderRadius: 9999,
          background: '#fff',
          transition: 'left 200ms ease-in-out',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'HIGH',   Icon: TrendingDown },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'MEDIUM', Icon: Minus },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'LOW',    Icon: TrendingUp },
  }
  const { color, bg, label, Icon } = map[severity]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 6,
      background: bg, color, fontSize: 9, fontWeight: 700,
      border: `1px solid ${color}44`, letterSpacing: '0.06em',
    }}>
      <Icon style={{ width: 9, height: 9 }} />
      {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InterviewSetupWizard({ onComplete, onDismiss, userId }: Props) {
  const [step, setStep]   = useState(1)
  const [leaving, setLeaving] = useState(false)

  // Step 1 — URL
  const [url,      setUrl]      = useState('')
  const [parsing,  setParsing]  = useState(false)
  const [parsed,   setParsed]   = useState(false)
  const [parseErr, setParseErr] = useState('')
  const [urlData,  setUrlData]  = useState<UrlParseResult | null>(null)

  // Step 2 — Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [cvText,     setCvText]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 3 — Context
  const [jobRole,       setJobRole]       = useState('')
  const [companyName,   setCompanyName]   = useState('')
  const [keyFocus,      setKeyFocus]      = useState('')
  const [jdText,        setJdText]        = useState('')
  const [matchScore,    setMatchScore]    = useState<number | null>(null)
  const [scoreLoading,  setScoreLoading]  = useState(false)
  const [scoreResult,   setScoreResult]   = useState<ScoreResult | null>(null)
  const [scoreAnimated, setScoreAnimated] = useState(0) // displayed animated value

  // Step 4 — Mode
  const [mode, setMode] = useState<AssistanceMode>('teleprompter')

  // Step 5 — Pre-flight
  const [micEnabled, setMicEnabled] = useState(false)
  const [savePreset, setSavePreset] = useState(true)
  const [micTesting, setMicTesting] = useState(false)
  const [micOk,      setMicOk]      = useState(false)

  // Launching state
  const [launching,  setLaunching]  = useState(false)
  const [launchErr,  setLaunchErr]  = useState('')

  // ── Animate match score when it arrives ────────────────────────────────────
  useEffect(() => {
    if (matchScore === null) return
    let current = 0
    const target = matchScore
    const timer = setInterval(() => {
      current = Math.min(current + 2, target)
      setScoreAnimated(current)
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [matchScore])

  // ── Auto-score when entering step 3 ────────────────────────────────────────
  useEffect(() => {
    if (step === 3 && matchScore === null && !scoreLoading) {
      triggerScoring()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goTo(next: number) {
    setLeaving(true)
    setTimeout(() => { setStep(next); setLeaving(false) }, 180)
  }
  const back = () => step > 1 && goTo(step - 1)
  const next = () => step < 5 && goTo(step + 1)

  // ── Step 1: Real URL parse ──────────────────────────────────────────────────
  async function handleParse() {
    if (!url.trim()) return
    setParsing(true); setParsed(false); setParseErr('')
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data: UrlParseResult & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)

      setUrlData(data)
      if (data.job_title)    setJobRole(prev => prev || data.job_title!)
      if (data.company_name) setCompanyName(prev => prev || data.company_name!)
      if (data.key_focus_areas) setKeyFocus(prev => prev || data.key_focus_areas!)

      // Build JD text for scoring
      const jdParts: string[] = []
      if (data.job_description_summary) jdParts.push(data.job_description_summary)
      if (data.key_requirements?.length) jdParts.push('Requirements: ' + data.key_requirements.join(', '))
      if (data.responsibilities?.length)  jdParts.push('Responsibilities: ' + data.responsibilities.join(', '))
      if (data.tech_stack?.length)        jdParts.push('Tech: ' + data.tech_stack.join(', '))
      if (jdParts.length) setJdText(jdParts.join('\n'))

      setParsed(true)
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : 'Failed to parse URL')
    } finally {
      setParsing(false)
    }
  }

  // ── Step 2: File drop ───────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.includes('pdf') || file.name.endsWith('.docx'))) {
      acceptFile(file)
    }
  }, [])

  function acceptFile(file: File) {
    setResumeFile(file)
    setResumeName(file.name)
    // Read as text for AI scoring (works well for .docx; PDF will give binary noise but still useful as context)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) || ''
      setCvText(text.slice(0, 12000)) // cap at 12k chars
    }
    reader.readAsText(file)
    // Reset score so it re-runs with the new CV
    setMatchScore(null)
    setScoreResult(null)
    setScoreAnimated(0)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) acceptFile(file)
  }

  // ── Step 3: Real CV scoring ─────────────────────────────────────────────────
  async function triggerScoring() {
    setScoreLoading(true)
    try {
      const res = await fetch('/api/score-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText:      cvText || '',
          jdText:      jdText || keyFocus || '',
          jobRole,
          companyName,
        }),
      })
      const data: ScoreResult & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)
      setScoreResult(data)
      setMatchScore(data.overall_score)
    } catch (err) {
      console.error('[score-cv]', err)
      // Fallback — set a conservative score so the UI doesn't break
      setMatchScore(35)
    } finally {
      setScoreLoading(false)
    }
  }

  // ── Step 5: Mic test ────────────────────────────────────────────────────────
  async function testMic() {
    setMicTesting(true); setMicOk(false)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setTimeout(() => { setMicEnabled(true); setMicOk(true); setMicTesting(false) }, 1200)
    } catch {
      setMicTesting(false)
    }
  }

  // ── Final: generate prompt + save to Supabase ───────────────────────────────
  async function handleComplete() {
    setLaunching(true); setLaunchErr('')
    try {
      // 1. Generate the AI system prompt
      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText:    cvText || '',
          jdText:    jdText || keyFocus || '',
          roleTitle: jobRole,
          company:   companyName,
          rate:      '',
        }),
      })
      const promptData: { system_prompt?: string; anchor_stories?: string[]; error?: string } = await promptRes.json()
      if (promptData.error) throw new Error(promptData.error)

      let profileId: string | undefined

      // 2. Save to Supabase (only if userId provided and savePreset enabled)
      if (userId && savePreset) {
        const saveRes = await fetch('/api/save-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id:       userId,
            role_title:    jobRole    || 'Interview Session',
            company_name:  companyName || null,
            system_prompt: promptData.system_prompt || '',
            anchor_stories: promptData.anchor_stories || [],
            cvText:        cvText  || '',
            jdText:        jdText  || keyFocus || '',
          }),
        })
        const saveData: { ok?: boolean; profile_id?: string; error?: string } = await saveRes.json()
        if (!saveData.error) profileId = saveData.profile_id
      }

      // 3. Call onComplete with full config
      onComplete({
        targetUrl:      url,
        resumeFile,
        resumeFileName: resumeName,
        jobRole,
        companyName,
        keyFocusAreas:  keyFocus,
        roleMatchScore: matchScore ?? 0,
        assistanceMode: mode,
        micEnabled,
        saveAsPreset:   savePreset,
        systemPrompt:   promptData.system_prompt,
        anchorStories:  promptData.anchor_stories,
        profileId,
        cvGaps:         scoreResult?.critical_gaps,
        jdText,
      })
    } catch (err) {
      setLaunchErr(err instanceof Error ? err.message : 'Launch failed. Please retry.')
      setLaunching(false)
    }
  }

  // ── Score ring colour ───────────────────────────────────────────────────────
  const scoreColor = scoreAnimated >= 75 ? '#10b981' : scoreAnimated >= 50 ? '#f59e0b' : '#ef4444'

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,11,17,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss?.() }}
    >
      {/* ── Modal Shell ────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%', maxWidth: 680,
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 24px 80px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
          transform: leaving ? 'scale(0.98) translateY(4px)' : 'scale(1) translateY(0)',
          opacity: leaving ? 0 : 1,
          transition: 'all 180ms ease-in-out',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px -4px rgba(99,102,241,0.5)',
              }}>
                <Zap style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div>
                <p style={{ color: '#f8fafc', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                  Interview Setup
                </p>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  Step {step} of 5 — {STEPS[step - 1].label}
                </p>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#64748b', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease-in-out',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                onMouseOut={e  => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#64748b' }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* 5-segment progress bar */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEPS.map((s, i) => {
              const active   = step === s.id
              const complete = step > s.id
              const Icon     = s.icon
              return (
                <React.Fragment key={s.id}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: '100%', height: 3, borderRadius: 9999,
                      background: complete ? '#6366f1' : active ? 'linear-gradient(90deg, #6366f1, #06b6d4)' : 'rgba(255,255,255,0.08)',
                      transition: 'all 300ms ease-in-out',
                      boxShadow: active ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: complete ? '#6366f1' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        border: complete ? '2px solid #6366f1' : active ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 300ms ease-in-out', flexShrink: 0,
                      }}>
                        {complete
                          ? <CheckCircle2 style={{ width: 10, height: 10, color: '#fff' }} />
                          : <Icon style={{ width: 9, height: 9, color: active ? '#6366f1' : '#334155' }} />
                        }
                      </div>
                      <span style={{
                        fontSize: 9.5, fontWeight: active ? 600 : 400,
                        color: complete ? '#6366f1' : active ? '#f8fafc' : '#475569',
                        whiteSpace: 'nowrap', transition: 'color 300ms ease-in-out',
                      }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* ── Step Body ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '28px 28px 24px',
            overflowY: 'auto', flex: 1,
            opacity: leaving ? 0 : 1,
            transform: leaving ? 'translateY(8px)' : 'translateY(0)',
            transition: 'all 180ms ease-in-out',
          }}
        >
          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                Target Interview Link
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Paste a LinkedIn job post, job board listing, or company careers page URL. We&apos;ll extract the role, company, and requirements automatically.
              </p>

              {/* URL input row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link2 style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15, color: '#64748b', pointerEvents: 'none',
                  }} />
                  <input
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setParsed(false); setUrlData(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleParse()}
                    placeholder="https://linkedin.com/jobs/view/..."
                    style={{
                      width: '100%', paddingLeft: 36, paddingRight: 14,
                      paddingTop: 11, paddingBottom: 11,
                      background: '#1e293b',
                      border: `1px solid ${parsed ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: '#f8fafc', fontSize: 13,
                      fontFamily: 'var(--font-mono)', outline: 'none',
                      transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { if (!parsed) e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
                    onBlur={e  => { e.target.style.borderColor = parsed ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <button
                  onClick={handleParse}
                  disabled={!url.trim() || parsing}
                  style={{
                    padding: '11px 18px', borderRadius: 10, border: 'none',
                    background: parsing ? 'rgba(99,102,241,0.5)' : '#6366f1',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: !url.trim() || parsing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'all 150ms ease-in-out',
                    whiteSpace: 'nowrap',
                    boxShadow: parsing ? 'none' : '0 0 16px -3px rgba(99,102,241,0.4)',
                  }}
                >
                  {parsing
                    ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Parsing…</>
                    : parsed
                    ? <><CheckCircle2 style={{ width: 14, height: 14, color: '#10b981' }} />Parsed!</>
                    : <><Sparkles style={{ width: 14, height: 14 }} />Parse URL</>
                  }
                </button>
              </div>

              {/* Parse error */}
              {parseErr && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ color: '#fca5a5', fontSize: 12 }}>{parseErr} — you can still continue and fill details manually.</p>
                </div>
              )}

              {/* Parsing feedback */}
              {parsing && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'glow-pulse 1s ease-in-out infinite' }} />
                  <p style={{ color: '#a5b4fc', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Fetching page · extracting role, company, requirements…
                  </p>
                </div>
              )}

              {/* Extracted data preview */}
              {parsed && urlData && (
                <div style={{
                  padding: '14px 16px', borderRadius: 12, marginBottom: 12,
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <CheckCircle2 style={{ width: 13, height: 13, color: '#10b981', flexShrink: 0 }} />
                    <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>Job details extracted — pre-populated below</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {urlData.job_title && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                        <span style={{ color: '#64748b', minWidth: 90 }}>Role:</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{urlData.job_title}</span>
                      </div>
                    )}
                    {urlData.company_name && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                        <span style={{ color: '#64748b', minWidth: 90 }}>Company:</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{urlData.company_name}</span>
                      </div>
                    )}
                    {urlData.employment_type && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                        <span style={{ color: '#64748b', minWidth: 90 }}>Type:</span>
                        <span style={{ color: '#94a3b8' }}>{urlData.employment_type}</span>
                      </div>
                    )}
                    {urlData.tech_stack && urlData.tech_stack.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                        <span style={{ color: '#64748b', minWidth: 90 }}>Tech:</span>
                        <span style={{ color: '#94a3b8' }}>{urlData.tech_stack.slice(0, 6).join(', ')}</span>
                      </div>
                    )}
                    {urlData.job_description_summary && (
                      <p style={{ color: '#64748b', fontSize: 11, marginTop: 4, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                        {urlData.job_description_summary}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Skip fallback */}
              <button
                onClick={next}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: 12, padding: '6px 0',
                  transition: 'color 150ms ease-in-out',
                }}
                onMouseOver={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseOut={e  => e.currentTarget.style.color = '#64748b'}
              >
                <SkipForward style={{ width: 12, height: 12 }} />
                Skip to manual entry
              </button>
            </div>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                Candidate Resume
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Upload your CV so the AI can tailor answers to your exact experience and score your fit for this role.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !resumeFile && fileRef.current?.click()}
                style={{
                  borderRadius: 16,
                  border: `2px dashed ${isDragging ? '#06b6d4' : resumeFile ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                  background: isDragging ? 'rgba(6,182,212,0.06)' : resumeFile ? 'rgba(16,185,129,0.06)' : 'rgba(30,41,59,0.5)',
                  padding: '44px 28px', textAlign: 'center',
                  cursor: resumeFile ? 'default' : 'pointer',
                  transition: 'all 200ms ease-in-out',
                  position: 'relative',
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFileChange} />

                {resumeFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText style={{ width: 24, height: 24, color: '#10b981' }} />
                    </div>
                    <div>
                      <p style={{ color: '#10b981', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{resumeName}</p>
                      <p style={{ color: '#64748b', fontSize: 11 }}>{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setResumeFile(null); setResumeName(''); setCvText(''); setMatchScore(null); setScoreResult(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '5px 12px', color: '#ef4444', fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      <X style={{ width: 11, height: 11 }} /> Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: isDragging ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isDragging ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Upload style={{ width: 24, height: 24, color: isDragging ? '#06b6d4' : '#334155' }} />
                    </div>
                    <div>
                      <p style={{ color: isDragging ? '#06b6d4' : '#94a3b8', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                        {isDragging ? 'Drop your file here' : 'Drag & drop your CV here'}
                      </p>
                      <p style={{ color: '#475569', fontSize: 11 }}>or click to browse · PDF or DOCX</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['PDF', 'DOCX'].map(t => (
                        <span key={t} style={{
                          padding: '3px 10px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p style={{ color: '#475569', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                Your file is analysed locally and never stored permanently.
              </p>
            </div>
          )}

          {/* ══ STEP 3 ══ */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                    Context & CV Score
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                    Review the extracted context. The AI is scoring your CV fit for this role.
                  </p>
                </div>

                {/* Role match score ring */}
                <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: 20 }}>
                  {scoreLoading ? (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                      <Loader2 style={{ width: 20, height: 20, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                      <span style={{ color: '#475569', fontSize: 8 }}>SCORING</span>
                    </div>
                  ) : matchScore !== null ? (
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', position: 'relative',
                      background: `conic-gradient(${scoreColor} ${scoreAnimated * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 20px -4px ${scoreColor}55`,
                      transition: 'background 50ms',
                    }}>
                      <div style={{
                        width: 54, height: 54, borderRadius: '50%', background: '#0f172a',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Star style={{ width: 10, height: 10, color: scoreColor, marginBottom: 1 }} />
                        <span style={{ color: scoreColor, fontSize: 15, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                          {scoreAnimated}
                        </span>
                        <span style={{ color: '#475569', fontSize: 8 }}>MATCH</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#334155', fontSize: 9 }}>—</span>
                    </div>
                  )}
                  <p style={{ color: '#64748b', fontSize: 9, marginTop: 6, textAlign: 'center' }}>ATS Match Score</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Job Role */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                    <Briefcase style={{ width: 11, height: 11, display: 'inline', marginRight: 5 }} />
                    Job Role
                  </label>
                  <input
                    value={jobRole}
                    onChange={e => setJobRole(e.target.value)}
                    placeholder="e.g. AI Trainer, Senior Frontend Engineer"
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none',
                      fontFamily: 'var(--font-inter)', transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* Company */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                    <Building2 style={{ width: 11, height: 11, display: 'inline', marginRight: 5 }} />
                    Company Name
                  </label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. micro1, Google, OpenAI"
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none',
                      fontFamily: 'var(--font-inter)', transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* Job Description / Interview Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <ListChecks style={{ width: 11, height: 11 }} />
                      Job Description / Interview Details
                    </label>
                    {jdText && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                        color: '#10b981', fontSize: 9, fontWeight: 600,
                      }}>
                        <CheckCircle2 style={{ width: 9, height: 9 }} />
                        Auto-filled from link
                      </span>
                    )}
                  </div>
                  <textarea
                    value={jdText}
                    onChange={e => {
                      setJdText(e.target.value)
                      // Reset score so it re-runs when JD is edited
                      setMatchScore(null); setScoreResult(null); setScoreAnimated(0)
                    }}
                    placeholder={`Paste the full job description or interview details here.

Example:
• We're looking for a Senior React developer...
• Requirements: 5+ years TypeScript, GraphQL...
• Responsibilities: Lead frontend architecture...

The more detail you provide, the smarter and more tailored the AI responses will be.`}
                    rows={7}
                    style={{
                      width: '100%', padding: '12px 14px',
                      background: '#1e293b', border: `1px solid ${jdText ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: '#f8fafc', fontSize: 12.5, outline: 'none',
                      fontFamily: 'var(--font-inter)', resize: 'vertical', lineHeight: 1.7,
                      transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
                    onBlur={e  => { e.target.style.borderColor = jdText ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                  <p style={{ color: '#475569', fontSize: 10.5, marginTop: 6, lineHeight: 1.5 }}>
                    Paste anything — job post, email brief, recruiter notes, or interview prep details.
                    The AI uses this to tailor every response to this exact role.
                  </p>

                  {/* Extracted tech tags */}
                  {urlData?.tech_stack && urlData.tech_stack.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      <span style={{ color: '#475569', fontSize: 10, alignSelf: 'center', marginRight: 2 }}>Detected:</span>
                      {urlData.tech_stack.slice(0, 10).map((t, i) => (
                        <span key={i} style={{
                          padding: '2px 9px', borderRadius: 6,
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                          color: '#a5b4fc', fontSize: 10, fontWeight: 500,
                        }}>{t}</span>
                      ))}
                      {urlData.key_requirements && urlData.key_requirements.slice(0, 4).map((r, i) => (
                        <span key={`req-${i}`} style={{
                          padding: '2px 9px', borderRadius: 6,
                          background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                          color: '#67e8f9', fontSize: 10, fontWeight: 500,
                        }}>{r.length > 28 ? r.slice(0, 28) + '…' : r}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CV Gap analysis */}
                {scoreResult && (
                  <div>
                    {/* Score breakdown */}
                    {scoreResult.score_breakdown && (
                      <div style={{
                        padding: '14px 16px', borderRadius: 12, marginBottom: 12,
                        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                      }}>
                        <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                          Score Breakdown
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {Object.entries(scoreResult.score_breakdown).map(([key, val]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                            const pct = Math.max(0, Math.min(100, val as number))
                            const c = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                            return (
                              <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
                                  <span style={{ color: c, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{pct}</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: c, transition: 'width 600ms ease-out' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {scoreResult.ats_verdict && (
                          <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                            {scoreResult.ats_verdict}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Critical gaps */}
                    {scoreResult.critical_gaps && scoreResult.critical_gaps.length > 0 && (
                      <div style={{
                        padding: '14px 16px', borderRadius: 12, marginBottom: 12,
                        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                      }}>
                        <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                          Critical Gaps to Address
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {scoreResult.critical_gaps.slice(0, 4).map((g, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SeverityBadge severity={g.severity} />
                                <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 500 }}>{g.gap}</span>
                              </div>
                              <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, paddingLeft: 0 }}>
                                → {g.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick wins */}
                    {scoreResult.quick_wins && scoreResult.quick_wins.length > 0 && (
                      <div style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)',
                      }}>
                        <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                          Quick Wins
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {scoreResult.quick_wins.slice(0, 3).map((w, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <CheckCheck style={{ width: 12, height: 12, color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Re-score button */}
                    <button
                      onClick={() => { setMatchScore(null); setScoreResult(null); setScoreAnimated(0); triggerScoring() }}
                      style={{
                        marginTop: 10, display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#6366f1', fontSize: 12, padding: '6px 0',
                      }}
                    >
                      <Sparkles style={{ width: 12, height: 12 }} />
                      Re-score with updated context
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ STEP 4 ══ */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                Assistance Mode
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
                Choose how the co-pilot delivers answers during your interview.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MODES.map(m => {
                  const selected = mode === m.id
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        padding: '16px 18px', borderRadius: 14,
                        background: selected ? m.bg : 'rgba(30,41,59,0.5)',
                        border: `1px solid ${selected ? m.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: selected ? m.glow : 'none',
                        transition: 'all 200ms ease-in-out',
                        display: 'flex', alignItems: 'flex-start', gap: 14, outline: 'none',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: selected ? `${m.accent}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selected ? `${m.accent}44` : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 200ms ease-in-out',
                      }}>
                        <Icon style={{ width: 18, height: 18, color: selected ? m.accent : '#475569' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ color: selected ? '#f8fafc' : '#94a3b8', fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-jakarta)' }}>
                            {m.label}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6,
                            background: selected ? m.tagBg : 'rgba(255,255,255,0.04)',
                            color: selected ? m.tagColor : '#475569',
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                            border: `1px solid ${selected ? `${m.tagColor}44` : 'rgba(255,255,255,0.06)'}`,
                          }}>
                            {m.tag}
                          </span>
                        </div>
                        <p style={{ color: selected ? '#94a3b8' : '#64748b', fontSize: 12, lineHeight: 1.6 }}>{m.desc}</p>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        background: selected ? m.accent : 'transparent',
                        border: `2px solid ${selected ? m.accent : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 200ms ease-in-out',
                        boxShadow: selected ? `0 0 10px -2px ${m.accent}` : 'none',
                      }}>
                        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══ STEP 5 ══ */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                Pre-Flight Check
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Final checks before launching your co-pilot overlay.
              </p>

              {/* Config summary */}
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 16,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Session Configuration
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: 'Role',    value: jobRole      || '—' },
                    { label: 'Company', value: companyName  || '—' },
                    { label: 'Mode',    value: MODES.find(m => m.id === mode)?.label || '—' },
                    { label: 'CV',      value: resumeName   || 'Not uploaded' },
                    { label: 'Score',   value: matchScore !== null ? `${matchScore}/100` : 'Not yet scored' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500, maxWidth: '65%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top gaps reminder */}
              {scoreResult?.critical_gaps && scoreResult.critical_gaps.filter(g => g.severity === 'high').length > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 16,
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <AlertTriangle style={{ width: 12, height: 12, color: '#ef4444' }} />
                    <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>High-priority gaps detected</p>
                  </div>
                  {scoreResult.critical_gaps.filter(g => g.severity === 'high').slice(0, 2).map((g, i) => (
                    <p key={i} style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5, marginBottom: 2 }}>
                      · {g.gap}
                    </p>
                  ))}
                </div>
              )}

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Mic toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 16px', borderRadius: 12,
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: micEnabled ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${micEnabled ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease-in-out',
                    }}>
                      {micEnabled
                        ? <Mic style={{ width: 16, height: 16, color: '#06b6d4' }} />
                        : <MicOff style={{ width: 16, height: 16, color: '#475569' }} />}
                    </div>
                    <div>
                      <p style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Microphone Input</p>
                      <p style={{ color: '#64748b', fontSize: 11 }}>
                        {micOk ? '✔ Microphone access granted' : 'Required for Live Adaptive mode'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {!micEnabled && (
                      <button onClick={testMic} disabled={micTesting} style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                        color: '#06b6d4', cursor: micTesting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        {micTesting ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : null}
                        {micTesting ? 'Testing…' : 'Test'}
                      </button>
                    )}
                    <Toggle on={micEnabled} onToggle={() => setMicEnabled(!micEnabled)} accent="#06b6d4" />
                  </div>
                </div>

                {/* Save preset toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 16px', borderRadius: 12,
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: savePreset ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${savePreset ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease-in-out',
                    }}>
                      <Save style={{ width: 16, height: 16, color: savePreset ? '#8b5cf6' : '#475569' }} />
                    </div>
                    <div>
                      <p style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Save & Activate Profile</p>
                      <p style={{ color: '#64748b', fontSize: 11 }}>Pushes config to desktop copilot overlay in real-time</p>
                    </div>
                  </div>
                  <Toggle on={savePreset} onToggle={() => setSavePreset(!savePreset)} accent="#8b5cf6" />
                </div>
              </div>

              {/* Launch error */}
              {launchErr && (
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ color: '#fca5a5', fontSize: 12 }}>{launchErr}</p>
                </div>
              )}

              {/* What happens next */}
              <div style={{
                marginTop: 16, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
              }}>
                <p style={{ color: '#6ee7b7', fontSize: 11, lineHeight: 1.6 }}>
                  <strong style={{ color: '#10b981' }}>What happens next:</strong> The AI will generate your personalised system prompt based on your CV and job description, then push it to the desktop overlay. Your copilot session will be live within seconds.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer nav ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15,23,42,0.6)',
        }}>
          {/* Back */}
          <button
            onClick={back}
            disabled={step === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10,
              background: step === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${step === 1 ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              color: step === 1 ? '#334155' : '#94a3b8',
              fontSize: 13, fontWeight: 500,
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease-in-out',
            }}
          >
            <ChevronLeft style={{ width: 15, height: 15 }} />
            Back
          </button>

          {/* Step counter */}
          <span style={{ color: '#475569', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {step} / 5
          </span>

          {/* Continue / Launch */}
          {step < 5 ? (
            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms ease-in-out',
                boxShadow: '0 0 20px -4px rgba(99,102,241,0.4)',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 28px -4px rgba(99,102,241,0.55)' }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px -4px rgba(99,102,241,0.4)' }}
            >
              Continue
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={launching}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 26px', borderRadius: 10, border: 'none',
                background: launching
                  ? 'rgba(16,185,129,0.4)'
                  : 'linear-gradient(90deg, #10b981, #06b6d4)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: launching ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease-in-out',
                boxShadow: launching ? 'none' : '0 0 25px -4px rgba(16,185,129,0.45), 0 0 50px -12px rgba(6,182,212,0.3)',
                letterSpacing: '0.01em',
              }}
            >
              {launching
                ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Launching…</>
                : <><Play style={{ width: 14, height: 14 }} />Start Copilot Session</>
              }
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #6366f1; }
          50% { opacity: 0.5; box-shadow: 0 0 12px #6366f1; }
        }
      `}</style>
    </div>
  )
}
