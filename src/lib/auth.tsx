import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { store } from './config'
import type { StaffUser } from './types'

interface AuthState {
  user: StaffUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<StaffUser>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store
      .currentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await store.signIn(email, password)
    setUser(u)
    return u
  }, [])

  const signOut = useCallback(async () => {
    await store.signOut()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Redirects to the login page when nobody is signed in. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-navy">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (!user) return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
