'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cpu, DollarSign, Clock, Trash2, CheckCircle2, Plus, Briefcase } from 'lucide-react'
import type { InterviewProfile, ActiveSession } from '@/lib/types'
import Link from 'next/link'

type Props = {
  userId: string
  initialProfiles: InterviewProfile[]
  initialSession: ActiveSession | null
}

export default function ProfilesClient({ userId, initialProfiles, initialSession }: Props) {
  const supabase  = createClient()
  const [profiles,   setProfiles]   = useState(initialProfiles)
  const [activeId,   setActiveId]   = useState(initialSession?.active_profile_id ?? null)
  const [settingId,  setSettingId]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function setActive(profileId: string) {
    setSettingId(profileId)
    await supabase.from('active_sessions').upsert({
      user_id: userId,
      active_profile_id: profileId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setActiveId(profileId)
    setSettingId(null)
  }

  async function deleteProfile(profileId: string) {
    if (!confirm('Delete this profile?')) return
    setDeletingId(profileId)
    await supabase.from('interview_profiles').delete().eq('id', profileId)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
    if (activeId === profileId) setActiveId(null)
    setDeletingId(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
          >
            Profile Manager
          </h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            {profiles.length} interview configuration{profiles.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Link
          href="/generate"
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white"
          style={{
            background: '#6366f1',
            boxShadow: '0 0 20px -3px rgba(99,102,241,0.35)',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#4f46e5'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 0 25px -3px rgba(99,102,241,0.45)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#6366f1'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 0 20px -3px rgba(99,102,241,0.35)'
          }}
        >
          <Plus className="w-4 h-4" /> New Profile
        </Link>
      </div>

      {/* Empty state */}
      {profiles.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center rounded-[10px]"
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-16 h-16 rounded-[10px] flex items-center justify-center mb-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Briefcase className="w-7 h-7" style={{ color: '#334155' }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}>No profiles yet</h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: '#64748b' }}>
            Generate your first AI-optimised interview profile using the AI Generator.
          </p>
          <Link
            href="/generate"
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white btn-primary"
          >
            Create First Profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map(profile => {
            const isActive   = profile.id === activeId
            const isSetting  = settingId  === profile.id
            const isDeleting = deletingId === profile.id

            return (
              <div
                key={profile.id}
                className="relative flex flex-col rounded-[10px] p-5 hover-lift"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,25,60,0.8) 100%)'
                    : '#0f172a',
                  border: isActive
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive
                    ? '0 0 30px -8px rgba(99,102,241,0.2), 0 4px 20px -2px rgba(0,0,0,0.5)'
                    : '0 4px 20px -2px rgba(0,0,0,0.5)',
                  transition: 'all 150ms ease-in-out',
                }}
              >
                {/* Active badge */}
                {isActive && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#10b981',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full status-dot-online" style={{ background: '#10b981' }} />
                    Active
                  </div>
                )}

                {/* Role icon */}
                <div
                  className="w-10 h-10 rounded-[10px] mb-4 flex items-center justify-center"
                  style={isActive ? {
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.25)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Cpu className="w-5 h-5" style={{ color: isActive ? '#6366f1' : '#64748b' }} />
                </div>

                {/* Title */}
                <h3
                  className="font-bold text-sm leading-tight mb-1"
                  style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
                >
                  {profile.role_title}
                </h3>
                {profile.company_name && (
                  <p className="text-xs mb-3" style={{ color: '#64748b' }}>{profile.company_name}</p>
                )}

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {profile.hourly_rate && (
                    <span
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                    >
                      <DollarSign className="w-2.5 h-2.5" />{profile.hourly_rate}/hr
                    </span>
                  )}
                  <span
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
                  >
                    <Clock className="w-2.5 h-2.5" />VAD {profile.vad_silence_threshold}s
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {profile.max_tokens} tok
                  </span>
                </div>

                {/* System prompt preview */}
                {profile.system_prompt && (
                  <p
                    className="text-[11px] leading-relaxed line-clamp-2 mb-4 flex-1 font-mono"
                    style={{ color: '#64748b' }}
                  >
                    {profile.system_prompt.slice(0, 120)}…
                  </p>
                )}

                {/* Actions */}
                <div
                  className="flex items-center gap-2 mt-auto pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <button
                    onClick={() => setActive(profile.id)}
                    disabled={isActive || isSetting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold"
                    style={isActive ? {
                      background: 'rgba(16,185,129,0.12)',
                      color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.25)',
                      cursor: 'default',
                      transition: 'all 150ms ease-in-out',
                    } : {
                      background: 'rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.25)',
                      cursor: isSetting ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms ease-in-out',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isSetting ? 'Setting...' : isActive ? 'Active' : 'Set as Active'}
                  </button>

                  <button
                    onClick={() => deleteProfile(profile.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-md"
                    style={{
                      color: '#64748b',
                      transition: 'all 150ms ease-in-out',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#64748b'
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
