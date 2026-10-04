'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Link2, FileText, Mic, CheckCircle2, Upload, X,
  ChevronRight, ChevronLeft, Zap, AlignLeft, BookOpen, Radio,
  Loader2, SkipForward, Target, Building2, ListChecks, Star,
  MicOff, Save, Play, Sparkles, Briefcase, AlertTriangle,
  TrendingUp, TrendingDown, Minus, CheckCheck, Rocket,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AssistanceMode = 'teleprompter' | 'coach' | 'adaptive'

export type WizardConfig = {
  targetUrl:      string
  resumeFile:     File | null
  resumeFileName: string
  jobRole:        string
  companyName:    string
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
  gap:            string
  severity:       'high' | 'medium' | 'low'
  recommendation: string
}

type ScoreBreakdown = {
  skills_match:          number
  experience_relevance:  number
  keyword_coverage:      number
  seniority_alignment:   number
}

type ScoreResult = {
  overall_score:   number
  score_breakdown: ScoreBreakdown
  strengths:       string[]
  critical_gaps:   CvGap[]
  missing_keywords: string[]
  ats_verdict:     string
  quick_wins:      string[]
}

type UrlParseResult = {
  job_title?:              string
  company_name?:           string
  location?:               string
  employment_type?:        string
  salary_range?:           string
  key_requirements?:       string[]
  nice_to_have?:           string[]
  responsibilities?:       string[]
  tech_stack?:             string[]
  job_description_summary?: string
  key_focus_areas?:        string
}

type Props = {
  onComplete:  (config: WizardConfig) => void
  onDismiss?:  () => void
  userId?:     string
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// Flow: URL → Job Details → Resume → Fit Score → Launch

const STEPS = [
  { id: 1, label: 'Job Link',    icon: Link2 },
  { id: 2, label: 'Job Details', icon: ListChecks },
  { id: 3, label: 'Resume',      icon: FileText },
  { id: 4, label: 'Fit Score',   icon: Target },
  { id: 5, label: 'Launch',      icon: Rocket },
]

const MODES = [
  {
    id: 'teleprompter' as AssistanceMode,
    icon: AlignLeft,
    label: 'Teleprompter / Compact',
    tag: 'DEFAULT',
    tagColor: '#10b981',
    tagBg: 'rgba(16,185,129,0.12)',
    desc: 'Concise bullet points and fast talking points for live reading during a call.',
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
    desc: 'Deep technical breakdowns, code examples, and framework-level explanations.',
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
    desc: 'Real-time audio transcription with dynamic responses based on what the interviewer says.',
    accent: '#06b6d4',
    border: 'rgba(6,182,212,0.35)',
    glow: '0 0 30px -6px rgba(6,182,212,0.35)',
    bg: 'rgba(6,182,212,0.08)',
  },
]

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, accent = '#6366f1' }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <button
      onClick={onToggle} aria-checked={on} role="switch"
      style={{
        width: 44, height: 24, borderRadius: 9999, cursor: 'pointer', outline: 'none', flexShrink: 0,
        background: on ? accent : '#1e293b',
        border: on ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
        position: 'relative', transition: 'all 200ms ease-in-out',
        boxShadow: on ? `0 0 12px -2px ${accent}55` : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 16, height: 16, borderRadius: 9999, background: '#fff',
        transition: 'left 200ms ease-in-out', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'HIGH',   Icon: TrendingDown },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'MED',    Icon: Minus },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'LOW',    Icon: TrendingUp },
  }
  const { color, bg, label, Icon } = map[severity]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 6, background: bg, color,
      fontSize: 9, fontWeight: 700, border: `1px solid ${color}44`, letterSpacing: '0.06em',
    }}>
      <Icon style={{ width: 9, height: 9 }} />{label}
    </span>
  )
}

function FieldInput({ label, icon: Icon, value, onChange, placeholder, mono = false }: {
  label: string; icon: React.ElementType; value: string
  onChange: (v: string) => void; placeholder: string; mono?: boolean
}) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
        <Icon style={{ width: 11, height: 11 }} />{label}
      </label>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '11px 14px',
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-inter)',
          transition: 'border-color 150ms ease-in-out',
        }}
        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
        onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InterviewSetupWizard({ onComplete, onDismiss, userId }: Props) {
  const [step,    setStep]    = useState(1)
  const [leaving, setLeaving] = useState(false)

  // Step 1 — URL
  const [url,      setUrl]      = useState('')
  const [parsing,  setParsing]  = useState(false)
  const [parsed,   setParsed]   = useState(false)
  const [parseErr, setParseErr] = useState('')
  const [urlData,  setUrlData]  = useState<UrlParseResult | null>(null)

  // Step 2 — Job Details
  const [jdText,      setJdText]      = useState('')
  const [jobRole,     setJobRole]     = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jdAutoFilled, setJdAutoFilled] = useState(false)

  // Step 3 — Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [cvText,     setCvText]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 4 — Fit Score + Mode
  const [matchScore,    setMatchScore]    = useState<number | null>(null)
  const [scoreLoading,  setScoreLoading]  = useState(false)
  const [scoreResult,   setScoreResult]   = useState<ScoreResult | null>(null)
  const [scoreAnimated, setScoreAnimated] = useState(0)
  const [mode,          setMode]          = useState<AssistanceMode>('teleprompter')

  // Step 5 — Launch
  const [micEnabled, setMicEnabled] = useState(false)
  const [savePreset, setSavePreset] = useState(true)
  const [micTesting, setMicTesting] = useState(false)
  const [micOk,      setMicOk]      = useState(false)
  const [launching,  setLaunching]  = useState(false)
  const [launchErr,  setLaunchErr]  = useState('')

  // ── Animate score ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (matchScore === null) return
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + 2, matchScore)
      setScoreAnimated(current)
      if (current >= matchScore) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [matchScore])

  // ── Auto-score on entering Step 4 (has both JD + CV at this point) ─────────
  useEffect(() => {
    if (step === 4 && matchScore === null && !scoreLoading) {
      triggerScoring()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goTo(n: number) {
    setLeaving(true)
    setTimeout(() => { setStep(n); setLeaving(false) }, 180)
  }
  const back = () => step > 1 && goTo(step - 1)
  const next = () => step < 5 && goTo(step + 1)

  // ── Step 1: Real URL parse ──────────────────────────────────────────────────
  async function handleParse() {
    if (!url.trim()) return
    setParsing(true); setParsed(false); setParseErr('')
    try {
      const res  = await fetch('/api/fetch-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data: UrlParseResult & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)

      setUrlData(data)
      if (data.job_title)    setJobRole(v  => v  || data.job_title!)
      if (data.company_name) setCompanyName(v => v || data.company_name!)

      // Build a structured JD string from parsed fields
      const jdParts: string[] = []
      if (data.job_description_summary) jdParts.push(data.job_description_summary)
      if (data.key_requirements?.length) jdParts.push('\nKey Requirements:\n' + data.key_requirements.map(r => `• ${r}`).join('\n'))
      if (data.responsibilities?.length)  jdParts.push('\nResponsibilities:\n' + data.responsibilities.map(r => `• ${r}`).join('\n'))
      if (data.tech_stack?.length)        jdParts.push('\nTech Stack: ' + data.tech_stack.join(', '))
      if (jdParts.length) { setJdText(jdParts.join('\n')); setJdAutoFilled(true) }

      setParsed(true)
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : 'Failed to parse URL')
    } finally {
      setParsing(false)
    }
  }

  // ── Step 3: File ────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.includes('pdf') || file.name.endsWith('.docx'))) acceptFile(file)
  }, [])

  function acceptFile(file: File) {
    setResumeFile(file); setResumeName(file.name)
    const reader = new FileReader()
    reader.onload = e => setCvText(((e.target?.result as string) || '').slice(0, 12000))
    reader.readAsText(file)
    setMatchScore(null); setScoreResult(null); setScoreAnimated(0)
  }

  // ── Step 4: Real scoring ────────────────────────────────────────────────────
  async function triggerScoring() {
    setScoreLoading(true)
    try {
      const res  = await fetch('/api/score-cv', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: cvText || '', jdText: jdText || '', jobRole, companyName }),
      })
      const data: ScoreResult & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)
      setScoreResult(data)
      setMatchScore(data.overall_score)
    } catch {
      setMatchScore(35) // conservative fallback
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
    } catch { setMicTesting(false) }
  }

  // ── Launch ──────────────────────────────────────────────────────────────────
  async function handleComplete() {
    setLaunching(true); setLaunchErr('')
    try {
      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText, roleTitle: jobRole, company: companyName, rate: '' }),
      })
      const promptData: { system_prompt?: string; anchor_stories?: string[]; error?: string } = await promptRes.json()
      if (promptData.error) throw new Error(promptData.error)

      let profileId: string | undefined
      if (savePreset) {
        const saveRes = await fetch('/api/save-profile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, role_title: jobRole || 'Interview Session',
            company_name: companyName || null, system_prompt: promptData.system_prompt || '',
            anchor_stories: promptData.anchor_stories || [], cvText, jdText,
          }),
        })
        const saveData: { ok?: boolean; profile_id?: string } = await saveRes.json()
        if (saveData.profile_id) profileId = saveData.profile_id
      }

      onComplete({
        targetUrl: url, resumeFile, resumeFileName: resumeName,
        jobRole, companyName, roleMatchScore: matchScore ?? 0,
        assistanceMode: mode, micEnabled, saveAsPreset: savePreset,
        systemPrompt: promptData.system_prompt, anchorStories: promptData.anchor_stories,
        profileId, cvGaps: scoreResult?.critical_gaps, jdText,
      })
    } catch (err) {
      setLaunchErr(err instanceof Error ? err.message : 'Launch failed. Please retry.')
      setLaunching(false)
    }
  }

  const scoreColor = scoreAnimated >= 75 ? '#10b981' : scoreAnimated >= 50 ? '#f59e0b' : '#ef4444'

  // ─── Shared input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font-inter)', transition: 'border-color 150ms ease-in-out',
  }
  const onFocusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'
  }
  const onBlurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,11,17,0.92)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss?.() }}
    >
      <div style={{
        width: '100%', maxWidth: 680, background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        boxShadow: '0 24px 80px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh',
        transform: leaving ? 'scale(0.98) translateY(4px)' : 'scale(1)',
        opacity: leaving ? 0 : 1, transition: 'all 180ms ease-in-out',
      }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                <p style={{ color: '#f8fafc', fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Interview Setup</p>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Step {step} of 5 — {STEPS[step - 1].label}</p>
              </div>
            </div>
            {onDismiss && (
              <button onClick={onDismiss} style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
              }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                onMouseOut={e  => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#64748b' }}
              ><X style={{ width: 14, height: 14 }} /></button>
            )}
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, i) => {
              const active = step === s.id; const complete = step > s.id; const Icon = s.icon
              return (
                <React.Fragment key={s.id}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: '100%', height: 3, borderRadius: 9999,
                      background: complete ? '#6366f1' : active ? 'linear-gradient(90deg,#6366f1,#06b6d4)' : 'rgba(255,255,255,0.08)',
                      transition: 'all 300ms', boxShadow: active ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        background: complete ? '#6366f1' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        border: (complete || active) ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 300ms',
                      }}>
                        {complete ? <CheckCircle2 style={{ width: 9, height: 9, color: '#fff' }} />
                                  : <Icon style={{ width: 8, height: 8, color: active ? '#6366f1' : '#334155' }} />}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
                        color: complete ? '#6366f1' : active ? '#f8fafc' : '#475569',
                      }}>{s.label}</span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* ── Step Body ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '28px 28px 24px', overflowY: 'auto', flex: 1,
          opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(8px)' : 'translateY(0)',
          transition: 'all 180ms ease-in-out',
        }}>

          {/* ══ STEP 1 — Job Link ══ */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Target Interview Link</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Paste a LinkedIn job post, job board listing, or careers page URL. We&apos;ll auto-extract the role, company, and write your job description for you.
              </p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link2 style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="url" value={url}
                    onChange={e => { setUrl(e.target.value); setParsed(false); setUrlData(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleParse()}
                    placeholder="https://linkedin.com/jobs/view/..."
                    style={{ ...inputStyle, paddingLeft: 36, fontFamily: 'var(--font-mono)', border: `1px solid ${parsed ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}` }}
                    onFocus={onFocusInput} onBlur={onBlurInput}
                  />
                </div>
                <button onClick={handleParse} disabled={!url.trim() || parsing} style={{
                  padding: '11px 18px', borderRadius: 10, border: 'none',
                  background: parsing ? 'rgba(99,102,241,0.5)' : '#6366f1',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: !url.trim() || parsing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
                  boxShadow: parsing ? 'none' : '0 0 16px -3px rgba(99,102,241,0.4)',
                  transition: 'all 150ms',
                }}>
                  {parsing ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Parsing…</>
                  : parsed  ? <><CheckCircle2 style={{ width: 14, height: 14, color: '#10b981' }} />Parsed!</>
                  :           <><Sparkles style={{ width: 14, height: 14 }} />Parse URL</>}
                </button>
              </div>

              {parseErr && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ color: '#fca5a5', fontSize: 12 }}>{parseErr} — you can still continue manually.</p>
                </div>
              )}

              {parsing && (
                <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'glow-pulse 1s ease-in-out infinite' }} />
                  <p style={{ color: '#a5b4fc', fontSize: 12, fontFamily: 'var(--font-mono)' }}>Fetching page · extracting role, requirements, tech stack…</p>
                </div>
              )}

              {parsed && urlData && (
                <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <CheckCircle2 style={{ width: 13, height: 13, color: '#10b981' }} />
                    <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>Job details extracted — pre-populating Step 2</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                    {urlData.job_title    && <div style={{ display: 'flex', gap: 8 }}><span style={{ color: '#64748b', minWidth: 80 }}>Role:</span><span style={{ color: '#94a3b8', fontWeight: 500 }}>{urlData.job_title}</span></div>}
                    {urlData.company_name && <div style={{ display: 'flex', gap: 8 }}><span style={{ color: '#64748b', minWidth: 80 }}>Company:</span><span style={{ color: '#94a3b8', fontWeight: 500 }}>{urlData.company_name}</span></div>}
                    {urlData.tech_stack?.length  && <div style={{ display: 'flex', gap: 8 }}><span style={{ color: '#64748b', minWidth: 80 }}>Tech:</span><span style={{ color: '#94a3b8' }}>{urlData.tech_stack.slice(0, 6).join(', ')}</span></div>}
                    {urlData.job_description_summary && <p style={{ color: '#64748b', fontSize: 11, marginTop: 4, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>{urlData.job_description_summary}</p>}
                  </div>
                </div>
              )}

              <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, padding: '6px 0' }}
                onMouseOver={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseOut={e  => e.currentTarget.style.color = '#64748b'}
              ><SkipForward style={{ width: 12, height: 12 }} />Skip — enter details manually</button>
            </div>
          )}

          {/* ══ STEP 2 — Job Details ══ */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Job Details</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
                Review and edit the job description. The more complete this is, the smarter and more tailored every AI response will be.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FieldInput label="Job Role" icon={Briefcase} value={jobRole} onChange={setJobRole} placeholder="e.g. AI Trainer, Senior Frontend Engineer" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FieldInput label="Company" icon={Building2} value={companyName} onChange={setCompanyName} placeholder="e.g. micro1, Google, OpenAI" />
                  </div>
                </div>

                {/* JD Paste Area */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <ListChecks style={{ width: 11, height: 11 }} />
                      Job Description / Interview Brief
                    </label>
                    {jdAutoFilled && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 9, fontWeight: 600 }}>
                        <CheckCircle2 style={{ width: 9, height: 9 }} />Auto-filled from link
                      </span>
                    )}
                  </div>
                  <textarea
                    value={jdText}
                    onChange={e => { setJdText(e.target.value); setJdAutoFilled(false); setMatchScore(null); setScoreResult(null); setScoreAnimated(0) }}
                    placeholder={`Paste the full job description or interview brief here.\n\nExample:\n• We're looking for a Senior React developer...\n• Requirements: 5+ years TypeScript, GraphQL...\n• Responsibilities: Lead frontend architecture...\n\nYou can also paste a recruiter's email, brief, or any role context.\nThe more detail you give, the better the AI's answers will be.`}
                    rows={10}
                    style={{
                      width: '100%', padding: '12px 14px', background: '#1e293b',
                      border: `1px solid ${jdText ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: '#f8fafc', fontSize: 12.5, outline: 'none',
                      fontFamily: 'var(--font-inter)', resize: 'vertical', lineHeight: 1.7,
                      transition: 'border-color 150ms',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)' }}
                    onBlur={e  => { e.target.style.borderColor = jdText ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                  <p style={{ color: '#475569', fontSize: 10.5, marginTop: 6 }}>
                    Paste anything — job post, email brief, recruiter notes, or interview prep notes.
                  </p>

                  {/* Tech tag chips from URL parse */}
                  {urlData?.tech_stack && urlData.tech_stack.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      <span style={{ color: '#475569', fontSize: 10, alignSelf: 'center' }}>Detected:</span>
                      {urlData.tech_stack.slice(0, 10).map((t, i) => (
                        <span key={i} style={{ padding: '2px 9px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: 10, fontWeight: 500 }}>{t}</span>
                      ))}
                      {urlData.key_requirements?.slice(0, 4).map((r, i) => (
                        <span key={`r${i}`} style={{ padding: '2px 9px', borderRadius: 6, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9', fontSize: 10, fontWeight: 500 }}>{r.length > 30 ? r.slice(0, 30) + '…' : r}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 3 — Resume ══ */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Candidate Resume</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Upload your CV so the AI can tailor answers to your exact experience and score your fit against the job description.
              </p>

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
                  cursor: resumeFile ? 'default' : 'pointer', transition: 'all 200ms',
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f) }} />
                {resumeFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText style={{ width: 24, height: 24, color: '#10b981' }} />
                    </div>
                    <div>
                      <p style={{ color: '#10b981', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{resumeName}</p>
                      <p style={{ color: '#64748b', fontSize: 11 }}>{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setResumeFile(null); setResumeName(''); setCvText(''); setMatchScore(null); setScoreResult(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 12px', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                      <X style={{ width: 11, height: 11 }} /> Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: isDragging ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDragging ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload style={{ width: 24, height: 24, color: isDragging ? '#06b6d4' : '#334155' }} />
                    </div>
                    <div>
                      <p style={{ color: isDragging ? '#06b6d4' : '#94a3b8', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{isDragging ? 'Drop your file here' : 'Drag & drop your CV here'}</p>
                      <p style={{ color: '#475569', fontSize: 11 }}>or click to browse · PDF or DOCX</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['PDF', 'DOCX'].map(t => (
                        <span key={t} style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 10, fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!resumeFile && (
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6 }}>
                    <strong style={{ color: '#94a3b8' }}>No CV?</strong> You can skip this — the AI will still create a strong session based on the job description alone, using natural phrases like &ldquo;in a previous role&rdquo; when referencing your background.
                  </p>
                </div>
              )}
              <p style={{ color: '#475569', fontSize: 11, marginTop: 10, textAlign: 'center' }}>Your file is read locally and never permanently stored.</p>
            </div>
          )}

          {/* ══ STEP 4 — Fit Score + Assist Mode ══ */}
          {step === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Your Fit Score</h2>
                  <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                    {scoreLoading ? 'Analysing your CV against the job description…' : 'Real ATS match score based on your CV and the job description.'}
                  </p>
                </div>

                {/* Score ring */}
                <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: 20 }}>
                  {scoreLoading ? (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Loader2 style={{ width: 22, height: 22, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                      <span style={{ color: '#475569', fontSize: 8 }}>SCORING</span>
                    </div>
                  ) : matchScore !== null ? (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: `conic-gradient(${scoreColor} ${scoreAnimated * 3.6}deg, rgba(255,255,255,0.06) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px -4px ${scoreColor}55`, transition: 'background 50ms' }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Star style={{ width: 10, height: 10, color: scoreColor, marginBottom: 1 }} />
                        <span style={{ color: scoreColor, fontSize: 17, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{scoreAnimated}</span>
                        <span style={{ color: '#475569', fontSize: 8 }}>MATCH</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#334155', fontSize: 9 }}>—</span>
                    </div>
                  )}
                  <p style={{ color: '#64748b', fontSize: 9, marginTop: 5 }}>ATS Match Score</p>
                </div>
              </div>

              {/* Score breakdown */}
              {scoreResult?.score_breakdown && (
                <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Score Breakdown</p>
                  {Object.entries(scoreResult.score_breakdown).map(([key, val]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    const pct = Math.max(0, Math.min(100, val as number))
                    const c = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={key} style={{ marginBottom: 7 }}>
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
                  {scoreResult.ats_verdict && <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>{scoreResult.ats_verdict}</p>}
                </div>
              )}

              {/* Critical gaps */}
              {scoreResult?.critical_gaps?.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Critical Gaps to Address</p>
                  {scoreResult.critical_gaps.slice(0, 4).map((g, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <SeverityBadge severity={g.severity} />
                        <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 500 }}>{g.gap}</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5 }}>→ {g.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick wins */}
              {scoreResult?.quick_wins?.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick Wins</p>
                  {scoreResult.quick_wins.slice(0, 3).map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                      <CheckCheck style={{ width: 12, height: 12, color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Re-score */}
              <button onClick={() => { setMatchScore(null); setScoreResult(null); setScoreAnimated(0); triggerScoring() }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 12, padding: '4px 0', marginBottom: 20 }}>
                <Sparkles style={{ width: 12, height: 12 }} />Re-score with current context
              </button>

              {/* ── Assist Mode ────────────────────────────────────────────────── */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                <h3 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 600, marginBottom: 4, fontFamily: 'var(--font-jakarta)' }}>Assistance Mode</h3>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>How should the co-pilot deliver answers during your interview?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MODES.map(m => {
                    const selected = mode === m.id; const MIcon = m.icon
                    return (
                      <button key={m.id} onClick={() => setMode(m.id)} style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 12,
                        background: selected ? m.bg : 'rgba(30,41,59,0.5)',
                        border: `1px solid ${selected ? m.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: selected ? m.glow : 'none',
                        transition: 'all 200ms', display: 'flex', alignItems: 'flex-start', gap: 12, outline: 'none',
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: selected ? `${m.accent}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${selected ? `${m.accent}44` : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
                          <MIcon style={{ width: 16, height: 16, color: selected ? m.accent : '#475569' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <span style={{ color: selected ? '#f8fafc' : '#94a3b8', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-jakarta)' }}>{m.label}</span>
                            <span style={{ padding: '2px 7px', borderRadius: 5, background: selected ? m.tagBg : 'rgba(255,255,255,0.04)', color: selected ? m.tagColor : '#475569', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{m.tag}</span>
                          </div>
                          <p style={{ color: selected ? '#94a3b8' : '#64748b', fontSize: 11, lineHeight: 1.5 }}>{m.desc}</p>
                        </div>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: selected ? m.accent : 'transparent', border: `2px solid ${selected ? m.accent : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms', boxShadow: selected ? `0 0 8px -2px ${m.accent}` : 'none' }}>
                          {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 5 — Launch ══ */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Launch Pre-Flight</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Final checks before activating your AI co-pilot.</p>

              {/* Config summary */}
              <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p style={{ color: '#475569', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Session Summary</p>
                {[
                  { label: 'Role',    value: jobRole      || '—' },
                  { label: 'Company', value: companyName  || '—' },
                  { label: 'JD',      value: jdText.trim() ? `${jdText.trim().slice(0, 60)}…` : 'Not provided' },
                  { label: 'CV',      value: resumeName   || 'Not uploaded' },
                  { label: 'Score',   value: matchScore !== null ? `${matchScore}/100` : '—' },
                  { label: 'Mode',    value: MODES.find(m => m.id === mode)?.label || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
                    <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Top gaps */}
              {scoreResult?.critical_gaps?.filter(g => g.severity === 'high').slice(0, 2).map((g, i) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', gap: 8 }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}><strong style={{ color: '#fca5a5' }}>High gap:</strong> {g.gap} → {g.recommendation}</p>
                </div>
              ))}

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {[
                  {
                    icon: micEnabled ? Mic : MicOff, accent: '#06b6d4',
                    title: 'Microphone Input',
                    sub: micOk ? '✔ Access granted' : 'Required for Live Adaptive mode',
                    on: micEnabled, toggle: () => setMicEnabled(!micEnabled),
                    extra: !micEnabled ? (
                      <button onClick={testMic} disabled={micTesting} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', cursor: micTesting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {micTesting && <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />}{micTesting ? 'Testing…' : 'Test'}
                      </button>
                    ) : null,
                  },
                  {
                    icon: Save, accent: '#8b5cf6',
                    title: 'Save & Activate Profile',
                    sub: 'Pushes config to the desktop overlay via Supabase Realtime',
                    on: savePreset, toggle: () => setSavePreset(!savePreset), extra: null,
                  },
                ].map(({ icon: Icon, accent, title, sub, on, toggle, extra }) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: on ? `${accent}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? `${accent}30` : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
                        <Icon style={{ width: 15, height: 15, color: on ? accent : '#475569' }} />
                      </div>
                      <div>
                        <p style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</p>
                        <p style={{ color: '#64748b', fontSize: 11 }}>{sub}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {extra}
                      <Toggle on={on} onToggle={toggle} accent={accent} />
                    </div>
                  </div>
                ))}
              </div>

              {launchErr && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ color: '#fca5a5', fontSize: 12 }}>{launchErr}</p>
                </div>
              )}

              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                <p style={{ color: '#6ee7b7', fontSize: 11, lineHeight: 1.6 }}>
                  <strong style={{ color: '#10b981' }}>What happens next:</strong> The AI generates a personalised co-pilot profile based on your CV + job description, then pushes it to the desktop overlay via Supabase Realtime. Your session goes live within seconds.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Nav ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.6)' }}>
          <button onClick={back} disabled={step === 1} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10,
            background: step === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${step === 1 ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
            color: step === 1 ? '#334155' : '#94a3b8', fontSize: 13, fontWeight: 500,
            cursor: step === 1 ? 'not-allowed' : 'pointer', transition: 'all 150ms',
          }}><ChevronLeft style={{ width: 15, height: 15 }} />Back</button>

          <span style={{ color: '#475569', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{step} / 5</span>

          {step < 5 ? (
            <button onClick={next} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(90deg,#6366f1,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 0 20px -4px rgba(99,102,241,0.4)', transition: 'all 150ms',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 28px -4px rgba(99,102,241,0.55)' }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '0 0 20px -4px rgba(99,102,241,0.4)' }}
            >Continue<ChevronRight style={{ width: 15, height: 15 }} /></button>
          ) : (
            <button onClick={handleComplete} disabled={launching} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px', borderRadius: 10, border: 'none',
              background: launching ? 'rgba(16,185,129,0.4)' : 'linear-gradient(90deg,#10b981,#06b6d4)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: launching ? 'not-allowed' : 'pointer',
              boxShadow: launching ? 'none' : '0 0 25px -4px rgba(16,185,129,0.45), 0 0 50px -12px rgba(6,182,212,0.3)',
              transition: 'all 150ms',
            }}>
              {launching ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Launching…</>
                         : <><Play  style={{ width: 14, height: 14 }} />Start Copilot Session</>}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow-pulse { 0%,100% { opacity:1; box-shadow:0 0 6px #6366f1; } 50% { opacity:0.5; box-shadow:0 0 12px #6366f1; } }
      `}</style>
    </div>
  )
}
