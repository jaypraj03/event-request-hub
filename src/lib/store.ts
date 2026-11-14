import type {
  Comment,
  DepartmentId,
  DepartmentRequestInput,
  EventInput,
  RequestStatus,
  RequestWithEvent,
  StaffUser,
  SubmitResult,
} from './types'

/**
 * Everything the UI needs from a backend. Two implementations exist:
 *  - SupabaseStore: real Postgres + Auth, used when VITE_SUPABASE_* env vars are set
 *  - LocalStore:    browser-only demo with seeded data, used otherwise
 */
export interface Store {
  readonly mode: 'supabase' | 'demo'

  /** Public: one event + N department requests, saved atomically. */
  submitEvent(event: EventInput, requests: DepartmentRequestInput[]): Promise<SubmitResult>

  signIn(email: string, password: string): Promise<StaffUser>
  signOut(): Promise<void>
  currentUser(): Promise<StaffUser | null>

  /** Staff: requests visible to the signed-in user (their department, or all for admins). */
  listRequests(department?: DepartmentId): Promise<RequestWithEvent[]>
  getRequest(id: string): Promise<RequestWithEvent | null>
  updateStatus(id: string, status: RequestStatus, actor: StaffUser): Promise<void>

  listComments(requestId: string): Promise<Comment[]>
  addComment(requestId: string, body: string, actor: StaffUser): Promise<Comment>
}

export class StoreError extends Error {}

/** Short, readable reference like EVT-7K3Q (no 0/O/1/I to avoid confusion). */
export function makeReference(random = Math.random) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(random() * chars.length)]
  return `EVT-${code}`
}

export function canSee(user: StaffUser, department: DepartmentId) {
  return user.role === 'admin' || user.role === department
}
