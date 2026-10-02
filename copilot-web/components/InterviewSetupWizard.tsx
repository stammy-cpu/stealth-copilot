'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Link2, FileText, Cpu, Mic, CheckCircle2, Upload, X,
  ChevronRight, ChevronLeft, Zap, AlignLeft, BookOpen, Radio,
  Loader2, SkipForward, Target, Building2, ListChecks, Star,
  MicOff, Save, Play, Sparkles, Briefcase,
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
}

type Props = {
  onComplete:  (config: WizardConfig) => void
  onDismiss?:  () => void
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Interview Link', icon: Link2 },
  { id: 2, label: 'Resume',         icon: FileText },
  { id: 3, label: 'Context',        icon: Target },
  { id: 4, label: 'Assist Mode',    icon: Cpu },
  { id: 5, label: 'Pre-Flight',     icon: CheckCircle2 },
]

// ─── Emerald gradient constants ───────────────────────────────────────────────

const EM = {
  grad:     'linear-gradient(90deg, #10B981, #34D399)',
  gradDiag: 'linear-gradient(135deg, #10B981, #34D399)',
  glow:     'rgba(16,185,129,0.25)',
  glowStr:  'rgba(16,185,129,0.45)',
  border:   'rgba(16,185,129,0.35)',
  bg:       'rgba(16,185,129,0.08)',
  text:     '#10b981',
  textDark: '#064E3B',
  shadow:   '0 0 30px -6px rgba(16,185,129,0.35)',
  pill: {
    bg:     'rgba(16,185,129,0.12)',
    color:  '#10b981',
    border: 'rgba(16,185,129,0.3)',
  },
} as const

// ─── Assistance modes ─────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'teleprompter' as AssistanceMode,
    icon: AlignLeft,
    label: 'Teleprompter / Compact',
    tag: 'DEFAULT',
    tagColor: EM.text,
    tagBg: EM.pill.bg,
    desc: 'Concise bullet points and fast talking points optimised for live reading during a call. Minimal latency, maximum clarity.',
  },
  {
    id: 'coach' as AssistanceMode,
    icon: BookOpen,
    label: 'Detailed Prep / Coach',
    tag: 'DEEP DIVE',
    tagColor: '#34D399',
    tagBg: 'rgba(52,211,153,0.12)',
    desc: 'Deep technical breakdowns, structured frameworks, and detailed context for senior-level interviews.',
  },
  {
    id: 'adaptive' as AssistanceMode,
    icon: Radio,
    label: 'Live Adaptive Copilot',
    tag: 'REAL-TIME',
    tagColor: '#6EE7B7',
    tagBg: 'rgba(110,231,183,0.1)',
    desc: 'Real-time audio transcription mode with dynamic prompt generation based on what the interviewer says.',
  },
]

// ─── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        width: 44, height: 24,
        borderRadius: 9999,
        background: on ? EM.grad : '#1e293b',
        border: on ? `1px solid ${EM.text}` : '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'all 200ms ease-in-out',
        cursor: 'pointer',
        flexShrink: 0,
        outline: 'none',
        boxShadow: on ? `0 0 12px -2px ${EM.glow}` : 'none',
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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function InterviewSetupWizard({ onComplete, onDismiss }: Props) {
  const [step, setStep]       = useState(1)
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

  // ── Animate match score when step 3 renders ──────────────────────────────
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

  // ── Navigation ───────────────────────────────────────────────────────────
  function goTo(next: number) {
    setLeaving(true)
    setTimeout(() => { setStep(next); setLeaving(false) }, 180)
  }
  const back = () => step > 1 && goTo(step - 1)
  const next = () => step < 5 && goTo(step + 1)

  // ── Step 1: Parse URL ────────────────────────────────────────────────────
  function handleParse() {
    if (!url.trim()) return
    setParsing(true); setParsed(false)
    setTimeout(() => {
      const u = url.toLowerCase()
      if (u.includes('linkedin'))    { setJobRole(p => p || 'Senior Software Engineer'); setCompanyName(p => p || 'LinkedIn') }
      else if (u.includes('micro1')) { setJobRole(p => p || 'AI Trainer / Evaluator'); setCompanyName(p => p || 'micro1'); setKeyFocus(p => p || 'LLM evaluation, prompt engineering, code auditing') }
      else                           { setJobRole(p => p || 'Software Engineer'); setCompanyName(p => p || 'Target Company') }
      setParsing(false); setParsed(true)
    }, 2200)
  }

  // ── Step 2: File drop ────────────────────────────────────────────────────
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

  // ── Step 5: Mic test ────────────────────────────────────────────────────
  async function testMic() {
    setMicTesting(true); setMicOk(false)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setTimeout(() => { setMicEnabled(true); setMicOk(true); setMicTesting(false) }, 1200)
    } catch { setMicTesting(false) }
  }

  // ── Complete ─────────────────────────────────────────────────────────────
  function handleComplete() {
    onComplete({
      targetUrl: url, resumeFile, resumeFileName: resumeName,
      jobRole, companyName, keyFocusAreas: keyFocus,
      roleMatchScore: matchScore, assistanceMode: mode,
      micEnabled, saveAsPreset: savePreset,
    })
  }

  // Score colour — always emerald once ≥60
  const scoreColor = matchScore >= 80 ? EM.text : matchScore >= 60 ? '#34D399' : '#f59e0b'

  // ─────────────────────────────────────────────────────────────────────────
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
      {/* ── Modal shell ──────────────────────────────────────────────────── */}
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
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '24px 28px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 20,
          }}
        >
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Icon badge — emerald gradient */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: EM.gradDiag,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 20px -4px ${EM.glow}`,
              }}>
                <Zap style={{ width: 18, height: 18, color: EM.textDark }} />
              </div>
              <div>
                <p style={{ color: '#f8fafc', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  Interview Setup
                </p>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 2, fontFamily: 'var(--font-sans)' }}>
                  Step {step} of 5 — {STEPS[step - 1].label}
                </p>
              </div>
            </div>

            {onDismiss && (
              <button
                id="btn-wizard-close"
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

          {/* ── 5-segment progress bar ──────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEPS.map((s, i) => {
              const active   = step === s.id
              const complete = step > s.id
              const Icon     = s.icon
              return (
                <React.Fragment key={s.id}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    {/* Segment bar */}
                    <div style={{
                      width: '100%', height: 3, borderRadius: 9999,
                      background: complete
                        ? EM.text
                        : active
                        ? EM.grad
                        : 'rgba(255,255,255,0.08)',
                      transition: 'all 300ms ease-in-out',
                      boxShadow: active ? `0 0 8px ${EM.glow}` : 'none',
                    }} />
                    {/* Step label with icon dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: complete ? EM.bg : active ? EM.bg : 'rgba(255,255,255,0.05)',
                        border: complete || active
                          ? `2px solid ${EM.border}`
                          : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 300ms ease-in-out',
                        flexShrink: 0,
                      }}>
                        {complete
                          ? <CheckCircle2 style={{ width: 10, height: 10, color: EM.text }} />
                          : <Icon style={{ width: 9, height: 9, color: active ? EM.text : '#334155' }} />
                        }
                      </div>
                      <span style={{
                        fontSize: 9.5, fontWeight: active ? 600 : 400,
                        fontFamily: 'var(--font-sans)',
                        color: complete ? EM.text : active ? '#f8fafc' : '#475569',
                        whiteSpace: 'nowrap',
                        transition: 'color 300ms ease-in-out',
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

        {/* ── Step body ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '28px 28px 24px',
            overflowY: 'auto', flex: 1,
            opacity: leaving ? 0 : 1,
            transform: leaving ? 'translateY(8px)' : 'translateY(0)',
            transition: 'all 180ms ease-in-out',
          }}
        >

          {/* ═══ STEP 1 ═════════════════════════════════════════════════ */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Target Interview Link
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Paste a LinkedIn job post, job board listing, or interview portal URL. We&apos;ll extract the role, company, and requirements automatically.
              </p>

              {/* URL input row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Link2 style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 15, height: 15, color: '#64748b', pointerEvents: 'none',
                  }} />
                  <input
                    id="input-wizard-url"
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setParsed(false) }}
                    onKeyDown={e => e.key === 'Enter' && handleParse()}
                    placeholder="https://linkedin.com/jobs/view/..."
                    style={{
                      width: '100%', paddingLeft: 36, paddingRight: 14,
                      paddingTop: 11, paddingBottom: 11,
                      background: '#1e293b',
                      border: `1px solid ${parsed ? EM.border : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: '#f8fafc', fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      transition: 'border-color 150ms ease-in-out',
                      boxShadow: parsed ? `0 0 0 2px ${EM.glow}` : undefined,
                    }}
                    onFocus={e => { if (!parsed) { e.target.style.borderColor = EM.border; e.target.style.boxShadow = `0 0 0 2px ${EM.glow}` } }}
                    onBlur={e  => { e.target.style.borderColor = parsed ? EM.border : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = parsed ? `0 0 0 2px ${EM.glow}` : 'none' }}
                  />
                </div>

                {/* Parse URL button — emerald gradient */}
                <button
                  id="btn-wizard-parse"
                  onClick={handleParse}
                  disabled={!url.trim() || parsing}
                  style={{
                    padding: '11px 18px', borderRadius: 10, border: 'none',
                    background: !url.trim() || parsing ? 'rgba(16,185,129,0.4)' : EM.grad,
                    color: EM.textDark, fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    cursor: !url.trim() || parsing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'all 150ms ease-in-out',
                    whiteSpace: 'nowrap',
                    boxShadow: parsing ? 'none' : `0 0 16px -3px ${EM.glow}`,
                  }}
                >
                  {parsing
                    ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Parsing…</>
                    : parsed
                    ? <><CheckCircle2 style={{ width: 14, height: 14 }} />Parsed!</>
                    : <><Sparkles style={{ width: 14, height: 14 }} />Parse URL</>
                  }
                </button>
              </div>

              {/* Parsing feedback */}
              {parsing && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                  background: EM.bg,
                  border: `1px solid ${EM.border}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: EM.text,
                    animation: 'pulse-dot 1s ease-in-out infinite',
                  }} />
                  <p style={{ fontFamily: 'var(--font-sans)', color: '#6ee7b7', fontSize: 12 }}>
                    Parsing metadata… extracting role, requirements, and company context.
                  </p>
                </div>
              )}

              {parsed && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                  background: EM.bg,
                  border: `1px solid ${EM.border}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: EM.text, flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-sans)', color: '#6ee7b7', fontSize: 12 }}>
                    Metadata extracted — role and context pre-populated for Step 3.
                  </p>
                </div>
              )}

              {/* Skip link */}
              <button
                id="btn-wizard-skip"
                onClick={next}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: 12, fontFamily: 'var(--font-sans)',
                  padding: '6px 0', transition: 'color 150ms ease-in-out',
                }}
                onMouseOver={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseOut={e  => e.currentTarget.style.color = '#64748b'}
              >
                <SkipForward style={{ width: 12, height: 12 }} />
                Skip to manual entry
              </button>
            </div>
          )}

          {/* ═══ STEP 2 ═════════════════════════════════════════════════ */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Candidate Resume
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Upload your CV so the AI can tailor answers to your exact experience. Supports PDF and DOCX.
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
                  border: `2px dashed ${isDragging ? EM.text : resumeFile ? EM.border : 'rgba(255,255,255,0.12)'}`,
                  background: isDragging
                    ? EM.bg
                    : resumeFile
                    ? 'rgba(16,185,129,0.06)'
                    : 'rgba(30,41,59,0.5)',
                  padding: '44px 28px',
                  textAlign: 'center',
                  cursor: resumeFile ? 'default' : 'pointer',
                  transition: 'all 200ms ease-in-out',
                  boxShadow: isDragging ? EM.shadow : 'none',
                  position: 'relative',
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: EM.bg,
                      border: `1px solid ${EM.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText style={{ width: 24, height: 24, color: EM.text }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', color: EM.text, fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                        {resumeName}
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 11 }}>
                        {resumeFile ? (resumeFile.size / 1024).toFixed(1) + ' KB' : ''}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setResumeFile(null); setResumeName('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '5px 12px',
                        color: '#ef4444', fontSize: 11, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 150ms ease-in-out',
                      }}
                    >
                      <X style={{ width: 11, height: 11 }} /> Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: isDragging ? EM.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isDragging ? EM.border : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease-in-out',
                    }}>
                      <Upload style={{ width: 24, height: 24, color: isDragging ? EM.text : '#334155' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', color: isDragging ? EM.text : '#94a3b8', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                        {isDragging ? 'Drop your file here' : 'Drag & drop your CV here'}
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#475569', fontSize: 11 }}>or click to browse · PDF or DOCX</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['PDF', 'DOCX'].map(t => (
                        <span key={t} style={{
                          padding: '3px 10px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#64748b', fontSize: 10, fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p style={{ fontFamily: 'var(--font-sans)', color: '#475569', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                Your file is processed locally and never stored permanently.
              </p>
            </div>
          )}

          {/* ═══ STEP 3 ═════════════════════════════════════════════════ */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                    Context Review
                  </h2>
                  <p style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                    Review and refine the extracted context. This drives your AI co-pilot&apos;s responses.
                  </p>
                </div>

                {/* Emerald match ring */}
                <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: 20 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', position: 'relative',
                    background: `conic-gradient(${scoreColor} ${matchScore * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 20px -4px ${scoreColor}55`,
                    transition: 'background 50ms',
                  }}>
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%',
                      background: '#0f172a',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Star style={{ width: 10, height: 10, color: scoreColor, marginBottom: 1 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', color: scoreColor, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
                        {matchScore}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', color: '#475569', fontSize: 8 }}>MATCH</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 9, marginTop: 6 }}>Role Match Score</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Job Role */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
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
                      fontFamily: 'var(--font-sans)', transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = EM.border; e.target.style.boxShadow = `0 0 0 2px ${EM.glow}` }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* Company */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
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
                      fontFamily: 'var(--font-sans)', transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = EM.border; e.target.style.boxShadow = `0 0 0 2px ${EM.glow}` }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* Key Focus Areas */}
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                    <ListChecks style={{ width: 11, height: 11, display: 'inline', marginRight: 5 }} />
                    Key Focus Areas
                  </label>
                  <textarea
                    value={keyFocus}
                    onChange={e => setKeyFocus(e.target.value)}
                    placeholder="e.g. LLM evaluation, prompt engineering, Python, system design, STAR framework..."
                    rows={3}
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, color: '#f8fafc', fontSize: 13, outline: 'none',
                      fontFamily: 'var(--font-sans)', resize: 'vertical', lineHeight: 1.6,
                      transition: 'border-color 150ms ease-in-out',
                    }}
                    onFocus={e => { e.target.style.borderColor = EM.border; e.target.style.boxShadow = `0 0 0 2px ${EM.glow}` }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4 ═════════════════════════════════════════════════ */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Assistance Mode
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
                Choose how the co-pilot delivers answers during your interview.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                        padding: '16px 18px', borderRadius: 14,
                        background: selected ? EM.bg : 'rgba(30,41,59,0.5)',
                        border: `1px solid ${selected ? EM.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: selected ? EM.shadow : 'none',
                        transition: 'all 200ms ease-in-out',
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        outline: 'none',
                      }}
                      onMouseOver={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                      onMouseOut={e  => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                    >
                      {/* Icon badge */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: selected ? EM.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selected ? EM.border : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 200ms ease-in-out',
                      }}>
                        <Icon style={{ width: 18, height: 18, color: selected ? EM.text : '#475569' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{
                            fontFamily: 'var(--font-heading)', color: selected ? '#f8fafc' : '#94a3b8',
                            fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em',
                          }}>
                            {m.label}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6,
                            background: selected ? m.tagBg : 'rgba(255,255,255,0.04)',
                            color: selected ? m.tagColor : '#475569',
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                            fontFamily: 'var(--font-sans)',
                            border: `1px solid ${selected ? m.tagColor + '44' : 'rgba(255,255,255,0.06)'}`,
                            transition: 'all 200ms ease-in-out',
                          }}>
                            {m.tag}
                          </span>
                        </div>
                        <p style={{
                          fontFamily: 'var(--font-sans)',
                          color: selected ? '#94a3b8' : '#64748b',
                          fontSize: 12, lineHeight: 1.6,
                          transition: 'color 200ms ease-in-out',
                        }}>
                          {m.desc}
                        </p>
                      </div>

                      {/* Radio dot — emerald */}
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        background: selected ? EM.grad : 'transparent',
                        border: `2px solid ${selected ? EM.text : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 200ms ease-in-out',
                        boxShadow: selected ? `0 0 10px -2px ${EM.glow}` : 'none',
                      }}>
                        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: EM.textDark }} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══ STEP 5 ═════════════════════════════════════════════════ */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.015em' }}>
                Pre-Flight Check
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Final checks before launching your co-pilot overlay.
              </p>

              {/* Config summary */}
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 20,
                background: EM.bg,
                border: `1px solid ${EM.border}`,
              }}>
                <p style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Session Configuration
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { label: 'Role',    value: jobRole      || '—' },
                    { label: 'Company', value: companyName  || '—' },
                    { label: 'Mode',    value: MODES.find(m => m.id === mode)?.label || '—' },
                    { label: 'Resume',  value: resumeName   || 'Not uploaded' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 12 }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', color: '#94a3b8', fontSize: 12, fontWeight: 500, maxWidth: '65%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

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
                      background: micEnabled ? EM.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${micEnabled ? EM.border : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease-in-out',
                    }}>
                      {micEnabled
                        ? <Mic    style={{ width: 16, height: 16, color: EM.text }} />
                        : <MicOff style={{ width: 16, height: 16, color: '#475569' }} />
                      }
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        Microphone Input
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 11 }}>
                        {micOk ? '✓ Microphone access granted' : 'Required for Live Adaptive mode'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {!micEnabled && (
                      <button
                        id="btn-wizard-test-mic"
                        onClick={testMic}
                        disabled={micTesting}
                        style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          background: EM.bg,
                          border: `1px solid ${EM.border}`,
                          color: EM.text,
                          cursor: micTesting ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 150ms ease-in-out',
                        }}
                      >
                        {micTesting && <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />}
                        {micTesting ? 'Testing…' : 'Test'}
                      </button>
                    )}
                    <Toggle on={micEnabled} onToggle={() => setMicEnabled(!micEnabled)} />
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
                      background: savePreset ? EM.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${savePreset ? EM.border : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease-in-out',
                    }}>
                      <Save style={{ width: 16, height: 16, color: savePreset ? EM.text : '#475569' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#f8fafc', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        Save Session as Preset
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', color: '#64748b', fontSize: 11 }}>
                        Store this configuration for future interviews
                      </p>
                    </div>
                  </div>
                  <Toggle on={savePreset} onToggle={() => setSavePreset(!savePreset)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer nav ───────────────────────────────────────────────── */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(15,23,42,0.6)',
          }}
        >
          {/* Back */}
          <button
            id="btn-wizard-back"
            onClick={back}
            disabled={step === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 10,
              background: step === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${step === 1 ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              color: step === 1 ? '#334155' : '#94a3b8',
              fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease-in-out',
            }}
            onMouseOver={e => { if (step !== 1) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#f8fafc' } }}
            onMouseOut={e  => { if (step !== 1) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' } }}
          >
            <ChevronLeft style={{ width: 15, height: 15 }} />
            Back
          </button>

          {/* Step counter */}
          <span style={{ fontFamily: 'var(--font-mono)', color: '#475569', fontSize: 11 }}>
            {step} / 5
          </span>

          {/* Continue / Launch */}
          {step < 5 ? (
            <button
              id="btn-wizard-next"
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: EM.grad,
                color: EM.textDark, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer', transition: 'all 150ms ease-in-out',
                boxShadow: `0 0 20px -4px ${EM.glow}`,
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 28px -4px ${EM.glowStr}` }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = `0 0 20px -4px ${EM.glow}` }}
            >
              Continue
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          ) : (
            <button
              id="btn-wizard-launch"
              onClick={handleComplete}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 26px',
                minHeight: 44,
                borderRadius: 10, border: 'none',
                background: EM.grad,
                color: EM.textDark, fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer', transition: 'all 150ms ease-in-out',
                boxShadow: `0 0 25px -4px ${EM.glow}`,
                letterSpacing: '0.01em',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 35px -4px ${EM.glowStr}` }}
              onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = `0 0 25px -4px ${EM.glow}` }}
            >
              <Play style={{ width: 14, height: 14 }} />
              Start Copilot Session
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
