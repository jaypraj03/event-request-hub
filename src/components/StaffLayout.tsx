import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ORG_NAME } from '../lib/config'
import { DEPARTMENT_BY_ID } from '../lib/departments'
import { DemoBanner } from './Layout'
import { Button, Logo } from './ui'

export function StaffLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  if (!user) return null
  const roleLabel = user.role === 'admin' ? 'Admin · all teams' : `${DEPARTMENT_BY_ID[user.role].icon} ${DEPARTMENT_BY_ID[user.role].name}`

  return (
    <>
      <DemoBanner />
      <header className="sticky top-0 z-10 border-b border-line bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/staff" aria-label="Dashboard">
            <Logo org={ORG_NAME} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-ink">{user.name}</div>
              <div className="text-xs text-slate-500">{roleLabel}</div>
            </div>
            <Button variant="secondary" className="px-3 py-2" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </>
  )
}
