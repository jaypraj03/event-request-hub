import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DemoBanner } from '../components/Layout'
import { Button, Card, Field, Input, Logo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { ORG_NAME, store } from '../lib/config'
import { DEMO_PASSWORD, DEMO_STAFF } from '../data/seed'

export function StaffLoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/staff'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DemoBanner />
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mx-auto mb-8">
          <Logo org={ORG_NAME} />
        </Link>
        <Card className="p-7">
          <h1 className="font-display text-2xl font-semibold">Staff sign in</h1>
          <p className="mt-1 text-sm text-slate-500">See and manage the requests for your team.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>
        </Card>

        {store.mode === 'demo' && (
          <Card className="mt-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Try a demo account</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_STAFF.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setEmail(s.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                  className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium transition hover:border-navy/40"
                >
                  {s.role === 'admin' ? 'Admin (all teams)' : s.name.split('(')[1]?.replace(')', '') ?? s.role}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Link to="/" className="mt-6 text-center text-sm text-slate-500 hover:text-navy">
          ← Back to the request form
        </Link>
      </div>
    </>
  )
}
