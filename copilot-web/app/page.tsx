'use client'

import { useState } from 'react'
import InterviewSetupWizard, { WizardConfig } from '@/components/InterviewSetupWizard'
import {
  Zap, CheckCircle2, Play, RotateCcw, Mic, AlignLeft,
  BookOpen, Radio, Star, AlertTriangle, Lightbulb,
  Shield, Activity,
} from 'lucide-react'

// ─── Copilot Live Screen ──────────────────────────────────────────────────────

function CopilotLiveScreen({ config, onReset }: { config: WizardConfig; onReset: () => void }) {
  const modeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    teleprompter: { label: 'Teleprompter / Compact', icon: AlignLeft, color: '#6366f1' },
    coach:        { label: 'Detailed Prep / Coach',  icon: BookOpen,  color: '#8b5cf6' },
    adaptive:     { label: 'Live Adaptive Copilot',  icon: Radio,     color: '#06b6d4' },
  }
  const modeInfo = modeLabels[config.assistanceMode] || modeLabels['teleprompter']
  const ModeIcon = modeInfo.icon

  const scoreColor = (config.roleMatchScore >= 75)
    ? '#10b981' : (config.roleMatchScore >= 50) ? '#f59e0b' : '#ef4444'

  const highGaps = (config.cvGaps || []).filter(g => g.severity === 'high')

  return (
    <div style={{
      minHeight: '100vh', background: '#080b11',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>

        {/* ── Success header ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px -6px rgba(16,185,129,0.6)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: '#fff' }} />
          </div>
          <h1 style={{
            color: '#f8fafc', fontSize: 26, fontWeight: 700,
            fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            Copilot Session Active
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            Your AI co-pilot has been configured and pushed to the desktop overlay.
            {config.profileId && ' Profile saved and activated via Supabase Realtime.'}
          </p>
        </div>

        {/* ── Live indicator ─────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 18px', borderRadius: 14, marginBottom: 16,
          background: 'rgba(16,185,129,0.07)',
          border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 10, height: 10 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#10b981',
                animation: 'live-dot 1.5s ease-in-out infinite',
              }} />
            </div>
            <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>LIVE — Desktop overlay active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity style={{ width: 13, height: 13, color: '#10b981' }} />
            <span style={{ color: '#64748b', fontSize: 11 }}>Realtime sync</span>
          </div>
        </div>

        {/* ── Session config card ────────────────────────────────────────── */}
        <div style={{
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 20, marginBottom: 16,
          boxShadow: '0 12px 40px -8px rgba(0,0,0,0.5)',
        }}>
          <p style={{ color: '#475569', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Active Session
          </p>

          {/* Role + Company */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-jakarta)', lineHeight: 1.2 }}>
                {config.jobRole || 'Interview Session'}
              </p>
              {config.companyName && (
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
                  at {config.companyName}
                </p>
              )}
            </div>
            {/* Score ring */}
            {config.roleMatchScore > 0 && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `conic-gradient(${scoreColor} ${config.roleMatchScore * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 16px -4px ${scoreColor}55`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: '#0f172a',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Star style={{ width: 9, height: 9, color: scoreColor }} />
                    <span style={{ color: scoreColor, fontSize: 13, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                      {config.roleMatchScore}
                    </span>
                  </div>
                </div>
                <p style={{ color: '#475569', fontSize: 9, marginTop: 4 }}>ATS Score</p>
              </div>
            )}
          </div>

          {/* Mode + Mic */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: `${modeInfo.color}11`, border: `1px solid ${modeInfo.color}33`,
            }}>
              <ModeIcon style={{ width: 13, height: 13, color: modeInfo.color }} />
              <span style={{ color: modeInfo.color, fontSize: 11, fontWeight: 600 }}>{modeInfo.label}</span>
            </div>
            {config.micEnabled && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
              }}>
                <Mic style={{ width: 13, height: 13, color: '#06b6d4' }} />
                <span style={{ color: '#06b6d4', fontSize: 11, fontWeight: 600 }}>Mic Active</span>
              </div>
            )}
            {config.resumeFileName && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{config.resumeFileName}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

          {/* Anchor stories preview */}
          {config.anchorStories && config.anchorStories.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ color: '#475569', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                AI-Generated Anchor Stories
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {config.anchorStories.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 18, height: 18, borderRadius: 6,
                      background: 'rgba(99,102,241,0.15)', color: '#6366f1',
                      fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>
                    <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>{s}</p>
                  </div>
                ))}
                {config.anchorStories.length > 3 && (
                  <p style={{ color: '#475569', fontSize: 11, paddingLeft: 26 }}>
                    +{config.anchorStories.length - 3} more stories in overlay
                  </p>
                )}
              </div>
            </div>
          )}

          {/* High-priority gaps */}
          {highGaps.length > 0 && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertTriangle style={{ width: 11, height: 11, color: '#f87171' }} />
                <span style={{ color: '#f87171', fontSize: 10.5, fontWeight: 600 }}>Address these before/during the interview</span>
              </div>
              {highGaps.slice(0, 2).map((g, i) => (
                <p key={i} style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>· {g.gap} → {g.recommendation}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── How to use ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '16px 18px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Shield style={{ width: 13, height: 13, color: '#6366f1' }} />
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Desktop Overlay Usage</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              'The overlay is invisible to Zoom, Teams, and OBS screen capture',
              'Press Ctrl+Enter to force-trigger a response manually',
              'Press Escape to cancel a running generation mid-stream',
              'The overlay auto-listens when mic is enabled — speak naturally',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Lightbulb style={{ width: 11, height: 11, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onReset}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 150ms ease-in-out',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f8fafc' }}
            onMouseOut={e  => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8' }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
            New Session
          </button>
          <button
            onClick={() => window.open(window.location.origin, '_blank')}
            style={{
              flex: 2, padding: '12px 20px', borderRadius: 10, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 0 25px -4px rgba(16,185,129,0.4)',
              transition: 'all 150ms ease-in-out',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 35px -4px rgba(16,185,129,0.55)' }}
            onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 25px -4px rgba(16,185,129,0.4)' }}
          >
            <Play style={{ width: 14, height: 14 }} />
            Open Copilot Overlay
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px -6px rgba(16,185,129,0.6); }
          50%       { box-shadow: 0 0 60px -4px rgba(16,185,129,0.85); }
        }
        @keyframes live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [open,   setOpen]   = useState(false)
  const [result, setResult] = useState<WizardConfig | null>(null)

  function handleComplete(cfg: WizardConfig) {
    setResult(cfg)
    setOpen(false)
  }

  function handleReset() {
    setResult(null)
    setOpen(true)
  }

  // Show copilot live screen after completion
  if (result) {
    return <CopilotLiveScreen config={result} onReset={handleReset} />
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080b11',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Hero launcher card */}
      <div style={{
        maxWidth: 480, width: '100%', textAlign: 'center',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '48px 36px',
        boxShadow: '0 24px 80px -8px rgba(0,0,0,0.6)',
      }}>
        {/* Icon badge */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px -6px rgba(99,102,241,0.6)',
        }}>
          <Zap style={{ width: 32, height: 32, color: '#fff' }} />
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 9999,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          marginBottom: 16,
        }}>
          <Shield style={{ width: 11, height: 11, color: '#10b981' }} />
          <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600 }}>Stealth Mode — Invisible to screen share</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', color: '#f8fafc',
          fontSize: 28, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.02em',
        }}>
          Interview Co-Pilot
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          Configure your AI assistant in 5 steps. Paste the job URL, upload your CV, and launch
          a personalised overlay that listens and responds in real-time during your live interview.
        </p>

        <button
          id="btn-launch-wizard"
          onClick={() => setOpen(true)}
          style={{
            padding: '14px 36px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 9,
            boxShadow: '0 0 30px -5px rgba(99,102,241,0.55)',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px -4px rgba(99,102,241,0.7)' }}
          onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '0 0 30px -5px rgba(99,102,241,0.55)' }}
        >
          <Zap style={{ width: 17, height: 17 }} />
          Launch Setup Wizard
        </button>

        <p style={{ color: '#334155', fontSize: 12, marginTop: 20 }}>
          5-step setup · AI CV scoring · Real-time overlay sync
        </p>
      </div>

      {/* Wizard modal */}
      {open && (
        <InterviewSetupWizard
          onComplete={handleComplete}
          onDismiss={() => setOpen(false)}
        />
      )}
    </div>
  )
}
