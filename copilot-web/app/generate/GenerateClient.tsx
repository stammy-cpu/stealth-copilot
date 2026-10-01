'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Sparkles, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react'

type Props = { userId: string }

type GeneratedConfig = {
  system_prompt: string
  anchor_stories: string[]
  role_title: string
  company_name: string
  hourly_rate: string
}

export default function GenerateClient({ userId }: Props) {
  const [cvText,    setCvText]    = useState('')
  const [jdText,    setJdText]    = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [company,   setCompany]   = useState('')
  const [rate,      setRate]      = useState('')
  const [fileName,  setFileName]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [result,    setResult]    = useState<GeneratedConfig | null>(null)
  const [error,     setError]     = useState('')
  const [saved,     setSaved]     = useState(false)

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setCvText(e.target?.result as string ?? '')
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1, multiple: false,
  })

  // ── Generate ──────────────────────────────────────────────────────────────
  async function generate() {
    if (!jdText.trim()) { setError('Please paste a job description.'); return }
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText, roleTitle, company, rate }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Generation failed') }
      setResult(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cvText, jdText, ...result }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-jakarta)', color: '#f8fafc' }}
        >
          AI Profile Generator
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Upload your CV and paste the job description — Groq AI generates an optimised co-pilot system prompt
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* CV Dropzone */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: '#94a3b8' }}
            >
              CV / Resume (PDF or TXT)
            </label>
            <div
              {...getRootProps()}
              className="rounded-[10px] p-8 text-center cursor-pointer"
              style={{
                border: `2px dashed ${isDragActive ? '#6366f1' : fileName ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                background: isDragActive
                  ? 'rgba(99,102,241,0.08)'
                  : fileName
                    ? 'rgba(16,185,129,0.06)'
                    : 'rgba(15,23,42,0.5)',
                transition: 'all 150ms ease-in-out',
                boxShadow: isDragActive ? '0 0 20px -4px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              <input {...getInputProps()} />
              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8" style={{ color: '#10b981' }} />
                  <p className="text-sm font-medium" style={{ color: '#10b981' }}>{fileName}</p>
                  <button
                    onClick={e => { e.stopPropagation(); setCvText(''); setFileName('') }}
                    className="flex items-center gap-1 text-xs transition-colors duration-150"
                    style={{ color: '#64748b' }}
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" style={{ color: isDragActive ? '#6366f1' : '#334155' }} />
                  <p className="text-sm" style={{ color: isDragActive ? '#6366f1' : '#94a3b8' }}>
                    {isDragActive ? 'Drop it here' : 'Drag & drop your CV here'}
                  </p>
                  <p className="text-xs" style={{ color: '#64748b' }}>or click to browse · PDF or TXT</p>
                </div>
              )}
            </div>
          </div>

          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Role Title', value: roleTitle, set: setRoleTitle, placeholder: 'AI Trainer', span: true },
              { label: 'Company',    value: company,   set: setCompany,   placeholder: 'micro1', span: false },
              { label: 'Rate ($/hr)', value: rate,     set: setRate,      placeholder: '$100–$180', span: false },
            ].map(({ label, value, set, placeholder, span }) => (
              <div key={label} className={span ? 'col-span-2' : ''}>
                <label
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: '#94a3b8' }}
                >
                  {label}
                </label>
                <input
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="input-base"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — JD ───────────────────────────────────────────── */}
        <div className="flex flex-col">
          <label
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#94a3b8' }}
          >
            Job Description
          </label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
            className="input-base flex-1 resize-none min-h-[320px] font-sans"
            style={{ lineHeight: '1.6' }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2.5 rounded-[10px] px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-[10px] text-sm font-semibold text-white"
        style={{
          background: loading
            ? 'rgba(99,102,241,0.5)'
            : 'linear-gradient(90deg, #6366f1, #06b6d4)',
          boxShadow: loading ? 'none' : '0 0 25px -5px rgba(99,102,241,0.35)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease-in-out',
        }}
        onMouseOver={e => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 0 30px -4px rgba(99,102,241,0.5)'
          }
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = loading ? 'none' : '0 0 25px -5px rgba(99,102,241,0.35)'
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Generating...' : 'Generate AI Profile'}
      </button>

      {/* ── Result card ──────────────────────────────────────────────────── */}
      {result && (
        <div
          className="rounded-[10px] overflow-hidden"
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)',
          }}
        >
          {/* Card header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
              <h3 className="font-semibold text-sm" style={{ color: '#f8fafc', fontFamily: 'var(--font-jakarta)' }}>
                Generated:{' '}
                <span style={{ color: '#6366f1' }}>{result.role_title}</span>
              </h3>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving || saved}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold"
              style={saved ? {
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)',
                transition: 'all 150ms ease-in-out',
              } : {
                background: '#6366f1',
                color: '#ffffff',
                transition: 'all 150ms ease-in-out',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {/* Anchor stories */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>
              5 Anchor Stories
            </p>
            <div className="space-y-3">
              {result.anchor_stories.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System prompt */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
              System Prompt
            </p>
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap rounded-md p-4 max-h-64 overflow-y-auto font-mono"
              style={{
                background: '#080b11',
                color: '#06b6d4',
                border: '1px solid rgba(6,182,212,0.15)',
              }}
            >
              {result.system_prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
