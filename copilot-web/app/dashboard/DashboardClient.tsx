'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Wifi, WifiOff, RefreshCw, Briefcase, DollarSign, Clock, ChevronRight, Zap } from 'lucide-react'
import type { InterviewProfile, ActiveSession } from '@/lib/types'
import Link from 'next/link'

type Props = {
  userId: string
  initialSession: ActiveSession | null
  initialProfiles: InterviewProfile[]
  activeProfile: InterviewProfile | null
}

export default function DashboardClient({ userId, initialSession, initialProfiles, activeProfile: initActive }: Props) {
  const supabase = createClient()
  const [session, setSession] = useState<ActiveSession | null>(initialSession)
  const [active,  setActive]  = useState<InterviewProfile | null>(initActive)
  const [syncing, setSyncing] = useState(false)
  const [synced,  setSynced]  = useState(false)
  const isOnline = session?.is_desktop_connected ?? false

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('active_sessions_dashboard')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'active_sessions',
        filter: `user_id=eq.${userId}`,
      }, payload => setSession(payload.new as ActiveSession))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── One-click sync ────────────────────────────────────────────────────────
  async function handleSync() {
    if (!active) return
    setSyncing(true)
    await supabase.from('active_sessions').upsert({
      user_id: userId,
      active_profile_id: active.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSyncing(false); setSynced(true)
    setTimeout(() => setSynced(false), 2500)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
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
            transition: 'all 150ms ease-in-out',
          } : {
            background: 'rgba(100,116,139,0.1)',
            border: '1px solid rgba(100,116,139,0.2)',
            color: '#64748b',
            transition: 'all 150ms ease-in-out',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: isOnline ? '#10b981' : '#475569',
              ...(isOnline ? { animation: 'glow-pulse 2s ease-in-out infinite' } : {}),
            }}
          />
          {isOnline
            ? <><Wifi className="w-3.5 h-3.5" />Desktop Online</>
            : <><WifiOff className="w-3.5 h-3.5" />Desktop Offline</>
          }
        </div>
      </div>

      {/* ── Active profile banner ───────────────────────────────────────────── */}
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
        {/* Subtle gradient wash when active */}
        {active && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(6,182,212,0.03) 100%)' }}
          />
        )}

        <div className="relative p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
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
              <Monitor
                className="w-6 h-6"
                style={{ color: active ? '#6366f1' : '#64748b' }}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#64748b' }}>
                Active Profile
              </p>
              {active ? (
                <>
                  <h2
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
                  >
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
                  No profile selected —{' '}
                  <Link href="/profiles" style={{ color: '#6366f1' }} className="hover:underline transition-colors duration-150">
                    choose one
                  </Link>
                </p>
              )}
            </div>
          </div>

          {active && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold"
              style={synced ? {
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981',
                transition: 'all 150ms ease-in-out',
              } : {
                background: syncing ? 'rgba(99,102,241,0.6)' : '#6366f1',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 0 20px -3px rgba(99,102,241,0.4)',
                transition: 'all 150ms ease-in-out',
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {synced ? 'Synced!' : syncing ? 'Syncing...' : 'One-Click Sync'}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Saved Profiles', value: initialProfiles.length, accent: '#6366f1' },
          { label: 'Max Tokens',     value: active?.max_tokens ?? '—',  accent: '#06b6d4' },
          { label: 'Temperature',    value: active?.temperature ?? '—', accent: '#8b5cf6' },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="rounded-[10px] p-5 hover-lift"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>
              {label}
            </p>
            <p
              className="text-3xl font-bold font-mono"
              style={{ color: accent }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent profiles ─────────────────────────────────────────────────── */}
      {initialProfiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#64748b' }}
            >
              Recent Profiles
            </h3>
            <Link
              href="/profiles"
              className="flex items-center gap-1 text-xs font-medium transition-colors duration-150"
              style={{ color: '#6366f1' }}
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {initialProfiles.slice(0, 3).map(p => {
              const isA = p.id === active?.id
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-[10px]"
                  style={{
                    background: isA ? 'rgba(99,102,241,0.1)' : '#0f172a',
                    border: isA ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 150ms ease-in-out',
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>{p.role_title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {p.company_name ?? 'No company'} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isA && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: 'rgba(99,102,241,0.15)',
                        color: '#6366f1',
                        border: '1px solid rgba(99,102,241,0.3)',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
