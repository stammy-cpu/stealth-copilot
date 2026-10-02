import type { Metadata } from 'next'
import { DM_Sans, Manrope, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['600', '700', '800'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Stealth Copilot Studio',
  description: 'A calm, private interview preparation workspace. Upload your resume, describe the role, and let AI guide your preparation.',
  keywords: ['AI interview', 'interview preparation', 'copilot', 'interview coach'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${manrope.variable} ${dmMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  )
}
