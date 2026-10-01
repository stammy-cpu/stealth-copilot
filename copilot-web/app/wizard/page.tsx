'use client'

import { useState } from 'react'
import InterviewSetupWizard, { WizardConfig } from '@/components/InterviewSetupWizard'
import { Zap, CheckCircle2 } from 'lucide-react'

export default function WizardDemoPage() {
  const [open,   setOpen]   = useState(false)
  const [result, setResult] = useState<WizardConfig | null>(null)

  function handleComplete(cfg: WizardConfig) {
    setResult(cfg)
    setOpen(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Hero card */}
      <div style={{
        maxWidth: 480, width: '100%', textAlign: 'center',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '48px 36px',
        boxShadow: '0 24px 80px -8px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px -4px rgba(99,102,241,0.55)',
        }}>
          <Zap style={{ width: 28, height: 28, color: '#fff' }} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-jakarta)', color: '#f8fafc',
          fontSize: 26, fontWeight: 700, marginBottom: 10,
        }}>
          Interview Setup Wizard
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          5-step interactive pre-flight wizard to configure your AI co-pilot before a live interview session.
        </p>

        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '13px 30px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 0 25px -5px rgba(99,102,241,0.45)',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 35px -4px rgba(99,102,241,0.6)' }}
          onMouseOut={e  => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 25px -5px rgba(99,102,241,0.45)' }}
        >
          <Zap style={{ width: 16, height: 16 }} />
          Launch Setup Wizard
        </button>

        {/* Completed result */}
        {result && (
          <div style={{
            marginTop: 32, padding: '16px 18px', borderRadius: 12, textAlign: 'left',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0 }} />
              <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                Session configured — onComplete fired ✓
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.entries(result)
                .filter(([k]) => !['resumeFile'].includes(k))
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)', minWidth: 110, flexShrink: 0 }}>{k}:</span>
                    <span style={{ color: '#94a3b8', wordBreak: 'break-all' }}>{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
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
