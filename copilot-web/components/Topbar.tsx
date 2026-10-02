'use client'

import { useState } from 'react'
import { Zap, Settings2, Wifi, WifiOff } from 'lucide-react'
import SettingsDrawer from './SettingsDrawer'

type Props = {
  isDesktopConnected?: boolean
}

export default function Topbar({ isDesktopConnected = false }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'hub'>('hub')

  return (
    <>
      <header className="topbar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(69,212,155,0.12)',
              border: '1px solid rgba(69,212,155,0.25)',
            }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--emerald)' }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Stealth Copilot
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Studio
            </p>
          </div>
        </div>

        {/* Nav — centered */}
        <nav className="flex-1 flex items-center justify-center gap-1">
          <button
            id="nav-preparation-hub"
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={activeTab === 'hub' ? {
              background: 'rgba(69,212,155,0.1)',
              border: '1px solid rgba(69,212,155,0.2)',
              color: 'var(--text-primary)',
            } : {
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hide-mobile">Preparation Hub</span>
          </button>
        </nav>

        {/* Right: connection + settings */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Desktop connection pill */}
          {isDesktopConnected ? (
            <div className="pill-connected">
              <span
                className="w-1.5 h-1.5 rounded-full pulse-dot"
                style={{ background: 'var(--emerald)' }}
              />
              <Wifi className="w-3 h-3" />
              <span className="hide-mobile">Desktop Agent Ready</span>
            </div>
          ) : (
            <div className="pill-offline">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }} />
              <WifiOff className="w-3 h-3" />
              <span className="hide-mobile">Open Desktop App</span>
            </div>
          )}

          {/* Settings icon */}
          <button
            id="btn-open-settings"
            onClick={() => setSettingsOpen(true)}
            className="ghost-action"
            style={{ padding: '0 12px', height: '36px' }}
            aria-label="Open App Settings"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hide-mobile text-xs">App Settings</span>
          </button>
        </div>
      </header>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
