'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  FileText, Upload, Briefcase, DollarSign,
  Zap, CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Link as LinkIcon, X, Star,
} from 'lucide-react'
import Topbar from '@/components/Topbar'

// ── Types ──────────────────────────────────────────────────────────────────────
type SavedInterview = {
  id: string
  role: string
  company: string
  selected?: boolean
}

type CopilotState = 'idle' | 'activating-1' | 'activating-2' | 'active'

// ── Saved interviews demo data ─────────────────────────────────────────────────
const DEMO_INTERVIEWS: SavedInterview[] = [
  { id: '1', role: 'Product Manager', company: 'Notion', selected: true },
  { id: '2', role: 'Customer Success', company: 'Intercom' },
  { id: '3', role: 'Operations Lead', company: 'Figma' },
]

// ── Preparation step progress indicator ───────────────────────────────────────
function StepIndicator({ step, active, done }: { step: number; active: boolean; done: boolean }) {
  return (
    <div
      className="step-number"
      style={done ? {
        background: 'rgba(69,212,155,0.15)',
        border: '1px solid rgba(69,212,155,0.35)',
        color: 'var(--emerald)',
      } : active ? {
        background: 'rgba(69,212,155,0.1)',
        border: '1px solid rgba(69,212,155,0.25)',
        color: 'var(--emerald)',
      } : {}}
    >
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
    </div>
  )
}

export default function PreparationHub() {
  // Form state
  const [resumeText, setResumeText]   = useState('')
  const [fileName,   setFileName]     = useState('')
  const [jdText,     setJdText]       = useState('')
  const [roleTitle,  setRoleTitle]    = useState('')
  const [company,    setCompany]      = useState('')
  const [rate,       setRate]         = useState('')
  const [linkUrl,    setLinkUrl]      = useState('')
  const [parsing,    setParsing]      = useState(false)

  // Copilot state
  const [copilotState, setCopilotState] = useState<CopilotState>('idle')
  const [generated,    setGenerated]   = useState('')
  const [generating,   setGenerating]  = useState(false)
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [genError,     setGenError]    = useState('')

  // Saved interviews
  const [savedInterviews] = useState<SavedInterview[]>(DEMO_INTERVIEWS)
  const [activeInterview, setActiveInterview] = useState<string>('1')

  // Step completion
  const step1Done = !!resumeText || !!linkUrl
  const step2Done = !!jdText.trim()
  const step3Done = !!roleTitle.trim()
  const allReady  = step1Done && step2Done && step3Done
  const isActive  = copilotState === 'active'

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setResumeText(e.target?.result as string ?? '')
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'] },
    maxFiles: 1, multiple: false,
  })

  // ── URL parse sim ───────────────────────────────────────────────────────────
  async function parseLink() {
    if (!linkUrl.trim()) return
    setParsing(true)
    await new Promise(r => setTimeout(r, 1800))
    setJdText(`[Parsed from ${linkUrl}]\n\nWe are looking for a ${roleTitle || 'talented professional'} to join our team...`)
    setParsing(false)
  }

  // ── Activate copilot ────────────────────────────────────────────────────────
  async function activate() {
    if (!allReady || copilotState !== 'idle') return
    setCopilotState('activating-1')
    await new Promise(r => setTimeout(r, 1000))
    setCopilotState('activating-2')
    await new Promise(r => setTimeout(r, 1000))
    // Generate prompt
    setGenerating(true); setGenError('')
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: resumeText, jdText, roleTitle, company, rate }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Generation failed')
      }
      const data = await res.json()
      setGenerated(data.system_prompt ?? '')
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
    setCopilotState('active')
  }

  function deactivate() {
    setCopilotState('idle')
    setStrategyOpen(false)
  }

  const selectedInterview = savedInterviews.find(i => i.id === activeInterview)

  // ── Activation button label ─────────────────────────────────────────────────
  const activationLabel = () => {
    if (copilotState === 'activating-1') return 'Initialising...'
    if (copilotState === 'activating-2') return 'Loading strategy...'
    if (isActive) return 'Copilot Active — Click to Stop'
    return allReady ? 'Activate Copilot' : 'Complete preparation steps to activate'
  }

  return (
    <div className="app-shell">
      <Topbar isDesktopConnected={false} />

      <main
        className="relative z-10 mx-auto px-7 pb-16"
        style={{ maxWidth: 1120, paddingTop: 40 }}
      >
        {/* ── Page title ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 34px)',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Preparation Hub
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
            Set up your interview details and activate the AI co-pilot — it stays hidden from screen sharing.
          </p>
        </div>

        {/* ── Copilot status banner ─────────────────────────────────────────── */}
        {isActive ? (
          <div className="status-banner mb-8">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 pulse-dot"
              style={{ background: 'var(--emerald)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Copilot Active &amp; Listening
              </p>
              {selectedInterview && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {selectedInterview.role} · {selectedInterview.company}
                </p>
              )}
            </div>
            <div
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(69,212,155,0.1)',
                border: '1px solid rgba(69,212,155,0.2)',
                color: 'var(--emerald)',
              }}
            >
              🔒 Hidden from Screen Sharing
            </div>
          </div>
        ) : null}

        {/* ── Three preparation steps ──────────────────────────────────────── */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>

          {/* Step 1 — Resume */}
          <div className="step-card">
            <div className="flex items-center gap-3 mb-4">
              <StepIndicator step={1} active={true} done={step1Done} />
              <div>
                <p className="eyebrow">Step 1</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>Your Resume</p>
              </div>
            </div>

            {!resumeText ? (
              <>
                {/* Drop zone */}
                <div
                  {...getRootProps()}
                  className={`drop-surface p-5 text-center mb-3 ${isDragActive ? 'drag-over' : ''}`}
                >
                  <input {...getInputProps()} id="input-resume-file" />
                  <Upload className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Drop CV here or click to browse
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>TXT or PDF · max 10 MB</p>
                </div>

                {/* Paste fallback */}
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Or paste CV text directly:</p>
                <textarea
                  id="textarea-resume-paste"
                  className="field"
                  style={{ minHeight: 72, fontSize: 12 }}
                  placeholder="Paste your CV here..."
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                />
              </>
            ) : (
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(69,212,155,0.07)', border: '1px solid rgba(69,212,155,0.2)' }}
              >
                <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--emerald)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {fileName || 'Resume pasted'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {resumeText.length.toLocaleString()} characters
                  </p>
                </div>
                <button
                  onClick={() => { setResumeText(''); setFileName('') }}
                  className="text-xs p-1 rounded"
                  style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  aria-label="Remove resume"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — Interview Details */}
          <div className="step-card">
            <div className="flex items-center gap-3 mb-4">
              <StepIndicator step={2} active={step1Done} done={step2Done} />
              <div>
                <p className="eyebrow">Step 2</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>Interview Details</p>
              </div>
            </div>

            {/* Link parse */}
            <div className="flex gap-2 mb-3">
              <input
                id="input-job-link"
                type="url"
                className="field"
                placeholder="Paste job listing URL…"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
              />
              <button
                onClick={parseLink}
                disabled={parsing || !linkUrl.trim()}
                className="ghost-action flex-shrink-0"
                style={{ height: 38, padding: '0 12px', fontSize: 12 }}
              >
                {parsing ? <Loader2 className="w-3.5 h-3.5 spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>{parsing ? 'Parsing…' : 'Parse'}</span>
              </button>
            </div>

            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Or paste job description:</p>
            <textarea
              id="textarea-job-description"
              className="field"
              style={{ minHeight: 90, fontSize: 12 }}
              placeholder="Paste the full job description here…"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
          </div>

          {/* Step 3 — Role Info */}
          <div className="step-card">
            <div className="flex items-center gap-3 mb-4">
              <StepIndicator step={3} active={step2Done} done={step3Done} />
              <div>
                <p className="eyebrow">Step 3</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>Role Information</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Job title</span>
                </label>
                <input
                  id="input-role-title"
                  className="field"
                  placeholder="e.g. Product Manager"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Company</label>
                <input
                  id="input-company"
                  className="field"
                  placeholder="Company name"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Hourly rate (optional)</span>
                </label>
                <input
                  id="input-rate"
                  className="field"
                  placeholder="e.g. 75"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Resume and interview cards ─────────────────────────────────────── */}
        <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Resume summary card */}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Resume</p>
            {resumeText ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: 'var(--emerald)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fileName || 'Pasted resume'}
                  </p>
                </div>
                <p
                  className="text-xs line-clamp-4"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                >
                  {resumeText.slice(0, 280)}{resumeText.length > 280 ? '…' : ''}
                </p>
                <button
                  onClick={() => { setResumeText(''); setFileName('') }}
                  className="text-xs mt-3"
                  style={{ color: 'var(--emerald)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Change resume
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                >
                  <FileText className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No resume uploaded yet</p>
              </div>
            )}
          </div>

          {/* Interview details summary card */}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Interview Details</p>
            {roleTitle || company ? (
              <div className="space-y-2">
                {roleTitle && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{roleTitle}</p>
                  </div>
                )}
                {company && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', paddingLeft: 18 }}>{company}</p>
                )}
                {rate && (
                  <p className="text-xs font-mono" style={{ color: 'var(--emerald)', paddingLeft: 18 }}>${rate}/hr</p>
                )}
                {jdText && (
                  <p className="text-xs mt-2 line-clamp-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 18 }}>
                    {jdText.slice(0, 200)}{jdText.length > 200 ? '…' : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                >
                  <Briefcase className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in role information above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Saved interview strip ────────────────────────────────────────── */}
        {savedInterviews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">Saved Interviews</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quick switch</p>
            </div>
            <div className="interview-strip">
              {savedInterviews.map(iv => (
                <button
                  key={iv.id}
                  id={`chip-interview-${iv.id}`}
                  onClick={() => setActiveInterview(iv.id)}
                  className={`interview-chip ${activeInterview === iv.id ? 'selected' : ''}`}
                >
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {iv.role}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {iv.company}
                  </p>
                  {activeInterview === iv.id && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--emerald)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--emerald)' }}>Selected</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Activation card ──────────────────────────────────────────────── */}
        <div
          className="panel p-6 mb-6"
          style={isActive ? {
            borderColor: 'rgba(69,212,155,0.25)',
            background: 'rgba(69,212,155,0.03)',
          } : {}}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {isActive ? 'Copilot is running' : 'Ready to activate?'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {isActive
                  ? 'The AI is listening and ready to help with your interview answers.'
                  : 'Complete all three steps above, then activate the co-pilot.'}
              </p>
              {genError && (
                <p className="text-xs mt-2" style={{ color: 'var(--status-error)' }}>{genError}</p>
              )}
            </div>

            <button
              id="btn-activate-copilot"
              onClick={isActive ? deactivate : activate}
              disabled={!isActive && (!allReady || copilotState === 'activating-1' || copilotState === 'activating-2' || generating)}
              className="primary-action flex-shrink-0"
              style={{
                minWidth: 180,
                ...(isActive ? {
                  background: 'rgba(239,68,68,0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: 'none',
                } : {}),
              }}
            >
              {(copilotState === 'activating-1' || copilotState === 'activating-2' || generating) && (
                <Loader2 className="w-4 h-4 spin" />
              )}
              {isActive && !generating && <Zap className="w-4 h-4" />}
              <span>{activationLabel()}</span>
            </button>
          </div>
        </div>

        {/* ── AI Interview Strategy (post-activation) ───────────────────────── */}
        {isActive && generated && (
          <div className="panel overflow-hidden">
            <button
              id="btn-toggle-strategy"
              onClick={() => setStrategyOpen(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4" style={{ color: 'var(--emerald)' }} />
                <span
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  AI Interview Strategy
                </span>
              </div>
              {strategyOpen
                ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              }
            </button>

            {strategyOpen && (
              <div
                className="px-6 pb-6"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <p
                  className="text-sm mt-4 whitespace-pre-wrap"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}
                >
                  {generated}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
