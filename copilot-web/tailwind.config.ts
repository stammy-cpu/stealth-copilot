import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        canvas: {
          DEFAULT: '#080b11',
          subtle:  '#0f172a',
          card:    '#1e293b',
          raised:  '#334155',
        },
        brand: {
          primary: '#6366f1',
          hover:   '#4f46e5',
          cyan:    '#06b6d4',
          violet:  '#8b5cf6',
        },
        content: {
          primary:   '#f8fafc',
          secondary: '#94a3b8',
          muted:     '#64748b',
          inverse:   '#020617',
        },
        stroke: {
          subtle:  'rgba(255, 255, 255, 0.08)',
          default: 'rgba(255, 255, 255, 0.15)',
          active:  '#6366f1',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error:   '#ef4444',
          info:    '#3b82f6',
        },
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-cyan':    '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-hover':   '0 0 20px -3px rgba(99, 102, 241, 0.4)',
        'glass':        '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card':         '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        glass: '12px',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        full: '9999px',
      },
      transitionDuration: {
        fast: '150ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

export default config
