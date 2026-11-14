import { LocalStore } from './localStore'
import type { Store } from './store'
import { SupabaseStore } from './supabaseStore'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const ORG_NAME = (import.meta.env.VITE_ORG_NAME as string | undefined) || 'Cultural Center'

export const store: Store = url && key ? new SupabaseStore(url, key) : new LocalStore()
