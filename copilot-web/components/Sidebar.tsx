'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, User2, Sparkles, LogOut, Zap } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Interview Studio', icon: LayoutDashboard },
  { href: '/profiles',  label: 'Profile Manager',  icon: User2 },
  { href: '/generate',  label: 'AI Generator',     icon: Sparkles },
]

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-50"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="p-5 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            boxShadow: '0 0 20px -4px rgba(99,102,241,0.5)',
          }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p
            className="text-sm font-bold leading-none"
            style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
          >
            Stealth Copilot
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>Control Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium group"
              style={{
                background:   active ? 'rgba(99,102,241,0.15)' : 'transparent',
                border:       active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                color:        active ? '#f8fafc' : '#94a3b8',
                transition:   'all 150ms ease-in-out',
                boxShadow:    active ? '0 0 12px -4px rgba(99,102,241,0.25)' : 'none',
              }}
              onMouseOver={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = '#f8fafc'
                }
              }}
              onMouseOut={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? '#6366f1' : undefined }}
              />
              {label}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Avatar row */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
          >
            {userEmail?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{userEmail ?? 'User'}</p>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-[10px] text-sm font-medium"
          style={{
            color: '#64748b',
            transition: 'all 150ms ease-in-out',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#64748b'
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
