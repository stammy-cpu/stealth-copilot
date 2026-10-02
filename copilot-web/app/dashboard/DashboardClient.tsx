'use client'

import { useState } from 'react'
import { Monitor, Wifi, WifiOff, RefreshCw, Briefcase, DollarSign, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

// In-memory profile shape (no DB)
export type LocalProfile = {
  id: string
  role_title: string
  company_name?: string
  hourly_rate?: string
  system_prompt?: string
  vad_silence_threshold: number
  max_tokens: number
  temperature: number
  created_at: string
}

export default function DashboardClient() {
  const [profiles]     = useState<LocalProfile[]>([])
  const [active]       = useState<LocalProfile | null>(null)
  const [isOnline]     = useState(false)
  const [synced, setSynced] = useState(false)

  function handleSync() {
    setSynced(true)
    setTimeout(() => setSynced(false), 2500)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
          >
            Interview Studio
          </h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Manage your active copilot configuration
          </p>
        </div>

        {/* Desktop connection badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={isOnline ? {
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981',
          } : {
            background: 'rgba(100,116,139,0.1)',
            border: '1px solid rgba(100,116,139,0.2)',
            color: '#64748b',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isOnline ? '#10b981' : '#475569' }}
          />
          {isOnline
            ? <><Wifi className="w-3.5 h-3.5" />Desktop Online</>
            : <><WifiOff className="w-3.5 h-3.5" />Desktop Offline</>
          }
        </div>
      </div>

      {/* ── Active profile banner ────────────────────────────────────────────── */}
      <div
        className="relative rounded-[10px] overflow-hidden"
        style={active ? {
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 0 40px -10px rgba(99,102,241,0.15)',
        } : {
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="relative p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={active ? {
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Monitor className="w-6 h-6" style={{ color: active ? '#6366f1' : '#64748b' }} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#64748b' }}>
                Active Profile
              </p>
              {active ? (
                <>
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}>
                    {active.role_title}
                  </h2>
                  <div className="flex items-center gap-4 mt-1.5">
                    {active.company_name && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#94a3b8' }}>
                        <Briefcase className="w-3 h-3" /> {active.company_name}
                      </span>
                    )}
                    {active.hourly_rate && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#10b981' }}>
                        <DollarSign className="w-3 h-3" /> {active.hourly_rate}/hr
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-mono" style={{ color: '#06b6d4' }}>
                      <Clock className="w-3 h-3" /> VAD {active.vad_silence_threshold}s
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: '#64748b' }}>
                  No profile loaded —{' '}
                  <Link href="/generate" style={{ color: '#6366f1' }} className="hover:underline">
                    generate one
                  </Link>
                </p>
              )}
            </div>
          </div>

          {active && (
            <button
              onClick={handleSync}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold"
              style={synced ? {
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981',
                transition: 'all 150ms ease-in-out',
              } : {
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 0 20px -3px rgba(99,102,241,0.4)',
                transition: 'all 150ms ease-in-out',
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              {synced ? 'Synced!' : 'Push to Desktop'}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Profiles (session)', value: profiles.length, accent: '#6366f1' },
          { label: 'Max Tokens',         value: active?.max_tokens ?? '—', accent: '#06b6d4' },
          { label: 'Temperature',        value: active?.temperature ?? '—', accent: '#8b5cf6' },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="rounded-[10px] p-5"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>
              {label}
            </p>
            <p className="text-3xl font-bold font-mono" style={{ color: accent }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Quick start CTA ──────────────────────────────────────────────────── */}
      {profiles.length === 0 && (
        <div
          className="rounded-[10px] p-8 text-center"
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Zap className="w-6 h-6" style={{ color: '#6366f1' }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: '#f8fafc' }}>
            No profiles yet
          </h3>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Use the AI Generator to build your first interview profile
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              color: '#fff',
              boxShadow: '0 0 20px -4px rgba(99,102,241,0.4)',
            }}
          >
            <Zap className="w-4 h-4" /> Generate Profile
          </Link>
        </div>
      )}
    </div>
  )
}
