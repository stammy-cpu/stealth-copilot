'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Zap, Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
  }

  if (done) return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#080b11' }}
    >
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <span className="text-2xl">✉️</span>
        </div>
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
        >
          Check your email
        </h2>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
          We sent a confirmation link to{' '}
          <strong style={{ color: '#f8fafc' }}>{email}</strong>
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold transition-colors duration-150"
          style={{ color: '#6366f1' }}
        >
          Back to login →
        </Link>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#080b11' }}
    >
      {/* Ambient glows */}
      <div
        className="absolute top-1/4 right-1/4 w-[400px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.07)', filter: 'blur(80px)' }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-[350px] h-[250px] rounded-full pointer-events-none"
        style={{ background: 'rgba(6,182,212,0.06)', filter: 'blur(80px)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                boxShadow: '0 0 25px -5px rgba(139,92,246,0.5)',
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-jakarta)',
                background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Stealth Copilot
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Create your account</p>
        </div>

        <div className="glass-panel rounded-lg p-8" style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#64748b' }} />
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="input-base pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#64748b' }} />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-base pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#64748b' }} />
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8}
                  className="input-base pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: '#64748b' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full"
              style={{ background: loading ? undefined : 'linear-gradient(90deg, #8b5cf6, #6366f1)' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#64748b' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold transition-colors duration-150" style={{ color: '#6366f1' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
