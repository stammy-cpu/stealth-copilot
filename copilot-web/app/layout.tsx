import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['500', '600', '700'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Stealth Copilot — Control Panel',
  description: 'AI-powered interview co-pilot control panel. Manage profiles, sync configurations, and monitor desktop agent status.',
  keywords: ['AI interview', 'copilot', 'micro1', 'interview assistant'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`
          ${inter.variable} ${jakarta.variable} ${mono.variable}
          font-sans antialiased min-h-screen
        `}
        style={{ backgroundColor: '#080b11', color: '#f8fafc' }}
      >
        {children}
      </body>
    </html>
  )
}
