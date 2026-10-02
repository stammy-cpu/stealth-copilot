'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Link2, FileText, Target, Cpu, CheckCircle2,
  Upload, X, ChevronRight, ChevronLeft, Zap,
  AlignLeft, BookOpen, Radio, Loader2, SkipForward,
  Briefcase, Building2, ListChecks, Star,
  Mic, MicOff, Save, Play,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

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
}

type Props = {
  onComplete: (config: WizardConfig) => void
  onDismiss?: () => void
}

// ─── Design tokens (matching globals.css) ──────────────────────────────────────

const T = {
  bgApp:       'hsl(225 11% 8%)',
  bgCard:      '#171a20',
  bgInput:     '#111318',
  border:      'hsl(220 10% 21%)',
  borderSubtle:'rgba(255 255 255 / 0.06)',
  emerald:     '#45d49b',
  emeraldHov:  '#63e5b1',
  emeraldText: '#092017',
  emeraldTint: 'rgba(69 212 155 / 0.07)',
  emeraldBdr:  'rgba(69 212 155 / 0.3)',
  emeraldGlow: 'rgba(69 212 155 / 0.22)',
  textPri:     'hsl(210 18% 93%)',
  textSec:     'hsl(215 15% 65%)',
  textMut:     'hsl(215 14% 45%)',
  fontHead:    'var(--font-heading)',
  fontSans:    'var(--font-sans)',
  fontMono:    'var(--font-mono)',
} as const

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Interview Link', icon: Link2 },
  { id: 2, label: 'Your Resume',    icon: FileText },
  { id: 3, label: 'Context',        icon: Target },
  { id: 4, label: 'Support Style',  icon: Cpu },
  { id: 5, label: 'Ready to Go',   icon: CheckCircle2 },
]

// ─── Assistance modes ──────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'teleprompter' as AssistanceMode,
    icon: AlignLeft,
    label: 'Teleprompter',
    tag: 'COMPACT',
    desc: 'Concise bullet points you can read in real time during the call. Fast, clear, and discreet.',
  },
  {
    id: 'coach' as AssistanceMode,
    icon: BookOpen,
    label: 'Detailed Prep',
    tag: 'DEEP DIVE',
    desc: 'Thorough explanations with context and examples. Great for technical or senior-level interviews.',
  },
  {
    id: 'adaptive' as AssistanceMode,
    icon: Radio,
    label: 'Live Copilot',
    tag: 'REAL-TIME',
    desc: 'Responds dynamically as the interviewer speaks. Best used with a microphone.',
  },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: T.textMut,
      fontFamily: T.fontSans, marginBottom: 6,
    }}>
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 500,
      color: T.textSec, fontFamily: T.fontSans, marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function WizardInput({
  value, onChange, placeholder, type = 'text', onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: T.bgInput,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '0 12px',
        height: 38,
        color: T.textPri,
        fontSize: 13,
        fontFamily: T.fontSans,
        outline: 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
      onFocus={e => {
        e.target.style.borderColor = T.emeraldBdr
        e.target.style.boxShadow = `0 0 0 3px rgba(69 212 155 / 0.1)`
      }}
      onBlur={e => {
        e.target.style.borderColor = T.border
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}

function WizardTextarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        background: T.bgInput,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '10px 12px',
        color: T.textPri,
        fontSize: 13,
        fontFamily: T.fontSans,
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.6,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
      onFocus={e => {
        e.target.style.borderColor = T.emeraldBdr
        e.target.style.boxShadow = `0 0 0 3px rgba(69 212 155 / 0.1)`
      }}
      onBlur={e => {
        e.target.style.borderColor = T.border
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 44, height: 24,
        borderRadius: 9999,
        background: on ? T.emerald : T.border,
        border: `1px solid ${on ? T.emerald : T.border}`,
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        outline: 'none',
        transition: 'background 200ms ease, box-shadow 200ms ease',
        boxShadow: on ? `0 0 10px -2px ${T.emeraldGlow}` : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3, left: on ? 23 : 3,
        width: 16, height: 16,
        borderRadius: 9999,
        background: on ? T.emeraldText : T.textMut,
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function InterviewSetupWizard({ onComplete, onDismiss }: Props) {
  const [step,    setStep]    = useState(1)
  const [leaving, setLeaving] = useState(false)

  // Step 1
  const [url,     setUrl]     = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed,  setParsed]  = useState(false)

  // Step 2
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [jobRole,       setJobRole]       = useState('')
  const [companyName,   setCompanyName]   = useState('')
  const [keyFocus,      setKeyFocus]      = useState('')
  const [matchScore,    setMatchScore]    = useState(0)
  const [scoreAnimated, setScoreAnimated] = useState(false)

  // Step 4
  const [mode, setMode] = useState<AssistanceMode>('teleprompter')

  // Step 5
  const [micEnabled, setMicEnabled] = useState(false)
  const [savePreset, setSavePreset] = useState(false)
  const [micTesting, setMicTesting] = useState(false)
  const [micOk,      setMicOk]      = useState(false)

  // ── Animate match score on step 3 ───────────────────────────────────────────
  useEffect(() => {
    if (step === 3 && !scoreAnimated) {
      const target = jobRole ? 88 : 72
      let current  = 0
      const timer  = setInterval(() => {
        current += 2
        setMatchScore(current)
        if (current >= target) { clearInterval(timer); setScoreAnimated(true) }
      }, 16)
      return () => clearInterval(timer)
    }
  }, [step, jobRole, scoreAnimated])

  // ── Navigation ───────────────────────────────────────────────────────────────
  function goTo(next: number) {
    setLeaving(true)
    setTimeout(() => { setStep(next); setLeaving(false) }, 160)
  }
  const goBack = () => step > 1 && goTo(step - 1)
  const goNext = () => step < 5 && goTo(step + 1)

  // ── Step 1: Parse URL sim ────────────────────────────────────────────────────
  function handleParse() {
    if (!url.trim()) return
    setParsing(true); setParsed(false)
    setTimeout(() => {
      const u = url.toLowerCase()
      if (u.includes('linkedin'))      { setJobRole(p => p || 'Senior Product Manager'); setCompanyName(p => p || 'LinkedIn') }
      else if (u.includes('micro1'))   { setJobRole(p => p || 'AI Evaluator'); setCompanyName(p => p || 'micro1'); setKeyFocus(p => p || 'LLM quality, prompt evaluation') }
      else                             { setJobRole(p => p || 'Software Engineer'); setCompanyName(p => p || 'Target Company') }
      setParsing(false); setParsed(true)
    }, 2200)
  }

  // ── Step 2: File handling ────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.includes('pdf') || file.name.endsWith('.docx'))) {
      setResumeFile(file); setResumeName(file.name)
    }
  }, [])
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setResumeFile(file); setResumeName(file.name) }
  }

  // ── Step 5: Mic test ─────────────────────────────────────────────────────────
  async function testMic() {
    setMicTesting(true); setMicOk(false)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setTimeout(() => { setMicEnabled(true); setMicOk(true); setMicTesting(false) }, 1200)
    } catch { setMicTesting(false) }
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  function handleComplete() {
    onComplete({
      targetUrl: url, resumeFile, resumeFileName: resumeName,
      jobRole, companyName, keyFocusAreas: keyFocus,
      roleMatchScore: matchScore, assistanceMode: mode, micEnabled, saveAsPreset: savePreset,
    })
  }

  const scoreColor = matchScore >= 80 ? T.emerald : matchScore >= 60 ? '#f59e0b' : '#ef4444'

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10 12 17 / 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss?.() }}
    >
      {/* ── Modal shell ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%', maxWidth: 660,
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          boxShadow: '0 32px 80px -8px rgba(0 0 0 / 0.7)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
          position: 'relative',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'scale(0.98) translateY(6px)' : 'scale(1) translateY(0)',
          transition: 'opacity 160ms ease, transform 160ms ease',
        }}
      >
        {/* Emerald radial glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 500, height: 200, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(69 212 155 / 0.08) 0%, transparent 65%)',
        }} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '22px 26px 0',
          borderBottom: `1px solid ${T.borderSubtle}`,
          paddingBottom: 18,
          position: 'relative',
        }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(69 212 155 / 0.1)',
                border: `1px solid ${T.emeraldBdr}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap style={{ width: 16, height: 16, color: T.emerald }} />
              </div>
              <div>
                <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, color: T.textPri, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  Interview Setup
                </p>
                <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textMut, marginTop: 2 }}>
                  Step {step} of 5 — {STEPS[step - 1].label}
                </p>
              </div>
            </div>

            {onDismiss && (
              <button
                id="btn-wizard-dismiss"
                onClick={onDismiss}
                aria-label="Close setup"
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textMut, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                onMouseOut={e  => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMut }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          {/* ── Step progress bar ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {STEPS.map((s, i) => {
              const active   = step === s.id
              const complete = step > s.id
              const Icon     = s.icon
              return (
                <React.Fragment key={s.id}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    {/* Bar segment */}
                    <div style={{
                      width: '100%', height: 3, borderRadius: 9999,
                      background: complete
                        ? T.emerald
                        : active
                        ? `linear-gradient(90deg, ${T.emerald}, rgba(69 212 155 / 0.4))`
                        : T.borderSubtle,
                      transition: 'background 300ms ease',
                      boxShadow: active ? `0 0 8px ${T.emeraldGlow}` : 'none',
                    }} />
                    {/* Label + dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: complete
                          ? 'rgba(69 212 155 / 0.15)'
                          : active
                          ? 'rgba(69 212 155 / 0.1)'
                          : 'rgba(255 255 255 / 0.03)',
                        border: `1px solid ${complete || active ? T.emeraldBdr : T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 300ms ease',
                        flexShrink: 0,
                      }}>
                        {complete
                          ? <CheckCircle2 style={{ width: 9, height: 9, color: T.emerald }} />
                          : <Icon style={{ width: 8, height: 8, color: active ? T.emerald : T.textMut }} />
                        }
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: active ? 600 : 400,
                        fontFamily: T.fontSans,
                        color: complete || active ? T.textSec : T.textMut,
                        whiteSpace: 'nowrap',
                        transition: 'color 300ms ease',
                      }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, height: 22, background: T.borderSubtle, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* ── Step content ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '26px 26px 22px',
            overflowY: 'auto', flex: 1,
            opacity: leaving ? 0 : 1,
            transform: leaving ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 160ms ease, transform 160ms ease',
          }}
        >

          {/* ═══ STEP 1 — Interview Link ══════════════════════════════════════ */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: T.fontHead, color: T.textPri, fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Paste the interview link
              </h2>
              <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 13, marginBottom: 22, lineHeight: 1.65 }}>
                Add a LinkedIn job post, job board listing, or company careers page. We&apos;ll pull out the role details automatically.
              </p>

              {/* URL input row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link2 style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    width: 14, height: 14, color: T.textMut, pointerEvents: 'none',
                  }} />
                  <input
                    id="input-wizard-url"
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setParsed(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleParse()}
                    placeholder="https://linkedin.com/jobs/view/..."
                    style={{
                      width: '100%', paddingLeft: 34, paddingRight: 12,
                      height: 40,
                      background: T.bgInput,
                      border: `1px solid ${parsed ? T.emeraldBdr : T.border}`,
                      borderRadius: 8,
                      color: T.textPri,
                      fontSize: 13,
                      fontFamily: T.fontMono,
                      outline: 'none',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease',
                      boxShadow: parsed ? `0 0 0 3px rgba(69 212 155 / 0.1)` : 'none',
                    }}
                    onFocus={e => { if (!parsed) { e.target.style.borderColor = T.emeraldBdr; e.target.style.boxShadow = 'rgba(69 212 155 / 0.1) 0 0 0 3px' } }}
                    onBlur={e  => { e.target.style.borderColor = parsed ? T.emeraldBdr : T.border; e.target.style.boxShadow = parsed ? 'rgba(69 212 155 / 0.1) 0 0 0 3px' : 'none' }}
                  />
                </div>
                <button
                  id="btn-wizard-parse"
                  onClick={handleParse}
                  disabled={!url.trim() || parsing}
                  style={{
                    padding: '0 18px',
                    height: 40, borderRadius: 8, border: 'none',
                    background: !url.trim() || parsing ? 'rgba(69 212 155 / 0.3)' : T.emerald,
                    color: T.emeraldText,
                    fontSize: 13, fontWeight: 600, fontFamily: T.fontSans,
                    cursor: !url.trim() || parsing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 150ms ease',
                    whiteSpace: 'nowrap',
                    boxShadow: !url.trim() || parsing ? 'none' : `0 0 16px -3px ${T.emeraldGlow}`,
                  }}
                >
                  {parsing
                    ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} />Parsing…</>
                    : parsed
                    ? <><CheckCircle2 style={{ width: 13, height: 13 }} />Fetched</>
                    : 'Parse Link'
                  }
                </button>
              </div>

              {/* Parsing status */}
              {parsing && (
                <div style={{
                  padding: '11px 14px', borderRadius: 8, marginBottom: 12,
                  background: T.emeraldTint,
                  border: `1px solid ${T.emeraldBdr}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: T.emerald,
                    flexShrink: 0,
                    animation: 'pulse-dot 1.4s ease-in-out infinite',
                  }} />
                  <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 12 }}>
                    Parsing link details...
                  </p>
                </div>
              )}

              {parsed && (
                <div style={{
                  padding: '11px 14px', borderRadius: 8, marginBottom: 12,
                  background: T.emeraldTint,
                  border: `1px solid ${T.emeraldBdr}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: T.emerald, flexShrink: 0 }} />
                  <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 12 }}>
                    Role and company details filled in — review them in Step 3.
                  </p>
                </div>
              )}

              {/* Skip link */}
              <button
                id="btn-wizard-skip"
                onClick={goNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.textMut, fontSize: 12, fontFamily: T.fontSans,
                  padding: '5px 0', transition: 'color 150ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.color = T.emerald}
                onMouseOut={e  => e.currentTarget.style.color = T.textMut}
              >
                <SkipForward style={{ width: 11, height: 11 }} />
                Skip to manual entry
              </button>
            </div>
          )}

          {/* ═══ STEP 2 — Resume ══════════════════════════════════════════════ */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: T.fontHead, color: T.textPri, fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Upload your CV
              </h2>
              <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 13, marginBottom: 22, lineHeight: 1.65 }}>
                Your CV helps tailor answers to your real experience. We support PDF and DOCX files.
              </p>

              {/* Drop zone */}
              <div
                id="dropzone-resume"
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !resumeFile && fileRef.current?.click()}
                style={{
                  borderRadius: 16,
                  border: `1.5px dashed ${isDragging ? T.emerald : resumeFile ? T.emeraldBdr : T.border}`,
                  background: isDragging
                    ? T.emeraldTint
                    : resumeFile
                    ? 'rgba(69 212 155 / 0.04)'
                    : `radial-gradient(ellipse at 50% 100%, rgba(69 212 155 / 0.04) 0%, transparent 65%)`,
                  padding: resumeFile ? '18px 22px' : '44px 28px',
                  textAlign: 'center',
                  cursor: resumeFile ? 'default' : 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                <input
                  ref={fileRef}
                  id="input-resume-file"
                  type="file"
                  accept=".pdf,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {resumeFile ? (
                  /* Compact selected file preview */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(69 212 155 / 0.12)',
                      border: `1px solid ${T.emeraldBdr}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText style={{ width: 20, height: 20, color: T.emerald }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: T.fontSans, color: T.textPri, fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {resumeName}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textMut }}>
                          {(resumeFile.size / 1024).toFixed(1)} KB
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px',
                          borderRadius: 99, fontFamily: T.fontSans,
                          background: 'rgba(69 212 155 / 0.1)',
                          border: `1px solid ${T.emeraldBdr}`,
                          color: T.emerald,
                        }}>
                          Ready
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setResumeFile(null); setResumeName('') }}
                      aria-label="Remove file"
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.18)',
                        color: '#ef4444', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ) : (
                  /* Upload prompt */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 13,
                      background: isDragging ? T.emeraldTint : 'rgba(255 255 255 / 0.04)',
                      border: `1px solid ${isDragging ? T.emeraldBdr : T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease',
                    }}>
                      <Upload style={{ width: 22, height: 22, color: isDragging ? T.emerald : T.textMut }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: T.fontSans, color: isDragging ? T.emerald : T.textSec, fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                        {isDragging ? 'Drop your file here' : 'Drag your CV here or click to browse'}
                      </p>
                      <p style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 11 }}>PDF or DOCX · up to 10 MB</p>
                    </div>
                  </div>
                )}
              </div>

              <p style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 11, marginTop: 10, textAlign: 'center' }}>
                Your file stays on your device and is never stored or shared.
              </p>
            </div>
          )}

          {/* ═══ STEP 3 — Context Review ══════════════════════════════════════ */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: T.fontHead, color: T.textPri, fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                    Review the details
                  </h2>
                  <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 13, lineHeight: 1.65 }}>
                    Check and refine what we found. This shapes how the co-pilot responds in your session.
                  </p>
                </div>

                {/* Match score ring — emerald */}
                <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: 20 }}>
                  <div style={{
                    width: 70, height: 70, borderRadius: '50%', position: 'relative',
                    background: `conic-gradient(${scoreColor} ${matchScore * 3.6}deg, rgba(255 255 255 / 0.05) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 18px -4px ${scoreColor}55`,
                    transition: 'background 40ms',
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: T.bgCard,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Star style={{ width: 9, height: 9, color: scoreColor, marginBottom: 1 }} />
                      <span style={{ fontFamily: T.fontMono, color: scoreColor, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                        {matchScore}
                      </span>
                      <span style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 8 }}>MATCH</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 9, marginTop: 5 }}>Profile fit</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Briefcase style={{ width: 11, height: 11 }} /> Job Role</span></FieldLabel>
                  <WizardInput value={jobRole} onChange={setJobRole} placeholder="e.g. Product Manager, Customer Success Lead" />
                </div>
                <div>
                  <FieldLabel><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Building2 style={{ width: 11, height: 11 }} /> Company</span></FieldLabel>
                  <WizardInput value={companyName} onChange={setCompanyName} placeholder="e.g. Notion, Intercom, Google" />
                </div>
                <div>
                  <FieldLabel><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ListChecks style={{ width: 11, height: 11 }} /> Key focus areas</span></FieldLabel>
                  <WizardTextarea
                    value={keyFocus}
                    onChange={setKeyFocus}
                    placeholder="e.g. stakeholder management, data-driven decisions, cross-functional collaboration..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4 — Assistance Mode ════════════════════════════════════ */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: T.fontHead, color: T.textPri, fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                How should the co-pilot help?
              </h2>
              <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 13, marginBottom: 22, lineHeight: 1.65 }}>
                Choose the style that suits how you interview best. You can change this later.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODES.map(m => {
                  const selected = mode === m.id
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      id={`btn-wizard-mode-${m.id}`}
                      onClick={() => setMode(m.id)}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        padding: '15px 16px', borderRadius: 12,
                        background: selected ? T.emeraldTint : 'rgba(255 255 255 / 0.02)',
                        border: `1px solid ${selected ? T.emeraldBdr : T.border}`,
                        boxShadow: selected ? `0 0 20px -6px ${T.emeraldGlow}` : 'none',
                        transition: 'all 180ms ease',
                        display: 'flex', alignItems: 'flex-start', gap: 13,
                        outline: 'none',
                      }}
                      onMouseOver={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255 255 255 / 0.18)' }}
                      onMouseOut={e  => { if (!selected) e.currentTarget.style.borderColor = T.border }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: selected ? 'rgba(69 212 155 / 0.12)' : 'rgba(255 255 255 / 0.04)',
                        border: `1px solid ${selected ? T.emeraldBdr : T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 180ms ease',
                      }}>
                        <Icon style={{ width: 17, height: 17, color: selected ? T.emerald : T.textMut }} />
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: T.fontHead, color: selected ? T.textPri : T.textSec, fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
                            {m.label}
                          </span>
                          <span style={{
                            padding: '2px 7px', borderRadius: 5,
                            background: selected ? 'rgba(69 212 155 / 0.12)' : 'rgba(255 255 255 / 0.04)',
                            color: selected ? T.emerald : T.textMut,
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                            fontFamily: T.fontSans,
                            border: `1px solid ${selected ? T.emeraldBdr : T.border}`,
                            transition: 'all 180ms ease',
                          }}>
                            {m.tag}
                          </span>
                        </div>
                        <p style={{ fontFamily: T.fontSans, color: selected ? T.textSec : T.textMut, fontSize: 12, lineHeight: 1.6, transition: 'color 180ms ease' }}>
                          {m.desc}
                        </p>
                      </div>

                      {/* Radio indicator */}
                      <div style={{
                        width: 17, height: 17, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                        background: selected ? T.emerald : 'transparent',
                        border: `2px solid ${selected ? T.emerald : T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 180ms ease',
                        boxShadow: selected ? `0 0 8px -2px ${T.emeraldGlow}` : 'none',
                      }}>
                        {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.emeraldText }} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══ STEP 5 — Pre-Flight ══════════════════════════════════════════ */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: T.fontHead, color: T.textPri, fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Ready to go
              </h2>
              <p style={{ fontFamily: T.fontSans, color: T.textSec, fontSize: 13, marginBottom: 20, lineHeight: 1.65 }}>
                Final checks before your co-pilot goes live. Everything is hidden from screen sharing.
              </p>

              {/* Summary card */}
              <div style={{
                padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                background: T.emeraldTint,
                border: `1px solid ${T.emeraldBdr}`,
              }}>
                <EyebrowLabel>Session Summary</EyebrowLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Role',    value: jobRole     || '—' },
                    { label: 'Company', value: companyName || '—' },
                    { label: 'Support', value: MODES.find(m => m.id === mode)?.label || '—' },
                    { label: 'CV',      value: resumeName  || 'Not uploaded' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 12 }}>{label}</span>
                      <span style={{
                        fontFamily: T.fontSans, color: T.textSec, fontSize: 12, fontWeight: 500,
                        maxWidth: '60%', textAlign: 'right',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Mic toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10,
                  background: T.bgInput, border: `1px solid ${T.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: micEnabled ? 'rgba(69 212 155 / 0.1)' : 'rgba(255 255 255 / 0.04)',
                      border: `1px solid ${micEnabled ? T.emeraldBdr : T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease',
                    }}>
                      {micEnabled
                        ? <Mic style={{ width: 15, height: 15, color: T.emerald }} />
                        : <MicOff style={{ width: 15, height: 15, color: T.textMut }} />
                      }
                    </div>
                    <div>
                      <p style={{ fontFamily: T.fontSans, color: T.textPri, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        {micEnabled ? 'Desktop Agent Ready' : 'Enable Microphone'}
                      </p>
                      <p style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 11 }}>
                        {micOk ? '✓ Microphone access confirmed' : 'Needed for real-time co-pilot mode'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {!micEnabled && (
                      <button
                        id="btn-wizard-test-mic"
                        onClick={testMic}
                        disabled={micTesting}
                        style={{
                          padding: '4px 11px', height: 28, borderRadius: 7,
                          fontSize: 11, fontWeight: 600, fontFamily: T.fontSans,
                          background: T.emeraldTint,
                          border: `1px solid ${T.emeraldBdr}`,
                          color: T.emerald,
                          cursor: micTesting ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 150ms ease',
                        }}
                      >
                        {micTesting && <Loader2 style={{ width: 11, height: 11, animation: 'spin 0.8s linear infinite' }} />}
                        {micTesting ? 'Checking…' : 'Test'}
                      </button>
                    )}
                    <Toggle on={micEnabled} onToggle={() => setMicEnabled(v => !v)} />
                  </div>
                </div>

                {/* Save preset toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10,
                  background: T.bgInput, border: `1px solid ${T.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: savePreset ? 'rgba(69 212 155 / 0.1)' : 'rgba(255 255 255 / 0.04)',
                      border: `1px solid ${savePreset ? T.emeraldBdr : T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease',
                    }}>
                      <Save style={{ width: 15, height: 15, color: savePreset ? T.emerald : T.textMut }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: T.fontSans, color: T.textPri, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        Save Session Preset
                      </p>
                      <p style={{ fontFamily: T.fontSans, color: T.textMut, fontSize: 11 }}>
                        Quickly reuse this setup for future interviews
                      </p>
                    </div>
                  </div>
                  <Toggle on={savePreset} onToggle={() => setSavePreset(v => !v)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer nav ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 26px',
            borderTop: `1px solid ${T.borderSubtle}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0 0 0 / 0.15)',
          }}
        >
          {/* Back */}
          <button
            id="btn-wizard-back"
            onClick={goBack}
            disabled={step === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 16px', height: 38, borderRadius: 8,
              background: step === 1 ? 'transparent' : 'rgba(255 255 255 / 0.05)',
              border: `1px solid ${step === 1 ? 'transparent' : T.border}`,
              color: step === 1 ? T.border : T.textSec,
              fontSize: 13, fontWeight: 500, fontFamily: T.fontSans,
              cursor: step === 1 ? 'default' : 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseOver={e => { if (step !== 1) { e.currentTarget.style.color = T.textPri } }}
            onMouseOut={e  => { if (step !== 1) { e.currentTarget.style.color = T.textSec } }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            Back
          </button>

          {/* Counter */}
          <span style={{ fontFamily: T.fontMono, color: T.textMut, fontSize: 11 }}>
            {step} / 5
          </span>

          {/* Continue / Launch */}
          {step < 5 ? (
            <button
              id="btn-wizard-next"
              onClick={goNext}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 22px', height: 38, borderRadius: 8, border: 'none',
                background: T.emerald,
                color: T.emeraldText,
                fontSize: 13, fontWeight: 600, fontFamily: T.fontSans,
                cursor: 'pointer', transition: 'all 150ms ease',
                boxShadow: `0 0 18px -4px ${T.emeraldGlow}`,
              }}
              onMouseOver={e => { e.currentTarget.style.background = T.emeraldHov; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseOut={e  => { e.currentTarget.style.background = T.emerald;    e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Continue
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button
              id="btn-wizard-launch"
              onClick={handleComplete}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 28px',
                height: 44,  /* min-height per spec */
                borderRadius: 8, border: 'none',
                background: T.emerald,
                color: T.emeraldText,
                fontSize: 14, fontWeight: 700, fontFamily: T.fontSans,
                cursor: 'pointer', transition: 'all 150ms ease',
                boxShadow: `0 0 24px -4px ${T.emeraldGlow}`,
                letterSpacing: '-0.01em',
              }}
              onMouseOver={e => { e.currentTarget.style.background = T.emeraldHov; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 32px -4px ${T.emeraldGlow}` }}
              onMouseOut={e  => { e.currentTarget.style.background = T.emerald;    e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = `0 0 24px -4px ${T.emeraldGlow}` }}
            >
              <Play style={{ width: 14, height: 14 }} />
              Start Copilot Session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
