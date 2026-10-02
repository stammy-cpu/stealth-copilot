'use client'

import { useState } from 'react'
import { X, Key, Mic, MessageSquare, Wifi } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const [groqKey,   setGroqKey]   = useState('')
  const [showKey,   setShowKey]   = useState(false)
  const [vadDelay,  setVadDelay]  = useState(2.7)
  const [maxTokens, setMaxTokens] = useState(380)
  const [tempVal,   setTempVal]   = useState(0.45)
  const [suggLen,   setSuggLen]   = useState<'brief'|'moderate'|'detailed'>('moderate')

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside className="drawer-content" role="dialog" aria-label="App Settings" aria-modal="true">
        <div className="flex flex-col h-full">

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-primary)' }}>
                App Settings
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Credentials, audio, and copilot behaviour
              </p>
            </div>
            <button
              id="btn-close-settings"
              onClick={onClose}
              className="ghost-action"
              style={{ padding: '0 10px', height: 34 }}
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── API Credentials ── */}
            <section>
              <p className="eyebrow mb-3">API Credentials</p>
              <div className="step-card space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span className="flex items-center gap-1.5"><Key className="w-3 h-3" /> Groq API Key</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-groq-key"
                      type={showKey ? 'text' : 'password'}
                      value={groqKey}
                      onChange={e => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="field pr-16"
                    />
                    <button
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Used only for AI response generation. Not stored or transmitted.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Audio Behaviour ── */}
            <section>
              <p className="eyebrow mb-3">Audio Behaviour</p>
              <div className="step-card space-y-5">
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Mic className="w-3.5 h-3.5" /> Silence threshold
                    </span>
                    <span className="mono text-sm" style={{ color: 'var(--emerald)' }}>{vadDelay.toFixed(1)}s</span>
                  </label>
                  <input
                    id="range-vad-delay"
                    type="range"
                    min={1} max={6} step={0.1}
                    value={vadDelay}
                    onChange={e => setVadDelay(parseFloat(e.target.value))}
                    className="range-control"
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    How long silence must last before the copilot responds.
                  </p>
                </div>

                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Max response tokens
                    </span>
                    <span className="mono text-sm" style={{ color: 'var(--emerald)' }}>{maxTokens}</span>
                  </label>
                  <input
                    id="range-max-tokens"
                    type="range"
                    min={80} max={600} step={10}
                    value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value))}
                    className="range-control"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Temperature
                    </span>
                    <span className="mono text-sm" style={{ color: 'var(--emerald)' }}>{tempVal.toFixed(2)}</span>
                  </label>
                  <input
                    id="range-temperature"
                    type="range"
                    min={0} max={1} step={0.01}
                    value={tempVal}
                    onChange={e => setTempVal(parseFloat(e.target.value))}
                    className="range-control"
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Lower values give more focused answers; higher values more creative.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Suggestion Length ── */}
            <section>
              <p className="eyebrow mb-3">Suggestion Length</p>
              <div className="step-card">
                <label className="flex items-center gap-1.5 mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <MessageSquare className="w-3.5 h-3.5" /> Response style
                </label>
                <div className="flex gap-2">
                  {(['brief', 'moderate', 'detailed'] as const).map(opt => (
                    <button
                      key={opt}
                      id={`btn-sugg-${opt}`}
                      onClick={() => setSuggLen(opt)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-150"
                      style={suggLen === opt ? {
                        background: 'rgba(69,212,155,0.12)',
                        border: '1px solid rgba(69,212,155,0.3)',
                        color: 'var(--emerald)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Connection State ── */}
            <section>
              <p className="eyebrow mb-3">Connection State</p>
              <div className="step-card">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                  >
                    <Wifi className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Desktop Agent</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open the desktop app to connect</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Keyboard Shortcuts ── */}
            <section>
              <p className="eyebrow mb-3">Keyboard Shortcuts</p>
              <div className="step-card space-y-2">
                {[
                  ['Start / Stop copilot', '⌘ Space'],
                  ['Push profile to desktop', '⌘ S'],
                  ['Open settings', '⌘ ,'],
                ].map(([action, shortcut]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{action}</span>
                    <kbd
                      className="mono"
                      style={{
                        fontSize: 11, padding: '2px 8px',
                        borderRadius: 6, background: 'var(--bg-input)',
                        border: '1px solid var(--border)', color: 'var(--text-secondary)',
                      }}
                    >
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>

            {/* Protection status */}
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{ background: 'rgba(69,212,155,0.05)', border: '1px solid rgba(69,212,155,0.15)', color: 'var(--text-muted)' }}
            >
              🔒 Protection Status: <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Active (Hidden from Screen Sharing)</span>
            </div>

          </div>

          {/* Footer */}
          <div
            className="px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button className="primary-action w-full" onClick={onClose}>
              Save Settings
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
