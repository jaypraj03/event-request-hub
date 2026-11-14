import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ORG_NAME, store } from '../lib/config'
import { Logo } from './ui'

export function DemoBanner() {
  if (store.mode !== 'demo') return null
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs text-white/85">
      <span className="font-semibold text-gold">Demo mode</span> — data is saved only in this browser. Staff login:{' '}
      <code className="rounded bg-white/10 px-1">admin@demo.org</code> or{' '}
      <code className="rounded bg-white/10 px-1">av@demo.org</code>, password{' '}
      <code className="rounded bg-white/10 px-1">demo1234</code>
    </div>
  )
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DemoBanner />
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <header className="flex items-center justify-between py-6">
          <Link to="/" aria-label="Home">
            <Logo org={ORG_NAME} />
          </Link>
          <Link
            to="/staff"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium shadow-sm transition hover:border-navy/40"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M8 5V4a1 1 0 011-1h6a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1v-1M3 10h9m0 0l-3-3m3 3l-3 3" />
            </svg>
            Staff login
          </Link>
        </header>
        <main>{children}</main>
      </div>
    </>
  )
}
