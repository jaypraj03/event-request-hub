import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { StoreError, type Store } from './store'
import type {
  Comment,
  DepartmentId,
  DepartmentRequestInput,
  EventInput,
  EventRecord,
  RequestStatus,
  RequestWithEvent,
  StaffUser,
  SubmitResult,
} from './types'

/* Row shapes as they come back from Postgres (snake_case). */
interface EventRow {
  id: string
  reference: string
  requester_name: string
  phone: string
  email: string
  event_name: string
  event_date: string
  requesting_team: string
  created_at: string
}
interface RequestRow {
  id: string
  event_id: string
  department: DepartmentId
  details: Record<string, never>
  status: RequestStatus
  created_at: string
  updated_at: string
  events: EventRow
}
interface CommentRow {
  id: string
  request_id: string
  author_name: string
  body: string
  kind: 'comment' | 'status'
  created_at: string
}

const toEvent = (e: EventRow): EventRecord => ({
  id: e.id,
  reference: e.reference,
  requesterName: e.requester_name,
  phone: e.phone,
  email: e.email,
  eventName: e.event_name,
  eventDate: e.event_date,
  requestingTeam: e.requesting_team,
  createdAt: e.created_at,
})

const toRequest = (r: RequestRow): RequestWithEvent => ({
  id: r.id,
  eventId: r.event_id,
  department: r.department,
  details: r.details,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  event: toEvent(r.events),
})

const toComment = (c: CommentRow): Comment => ({
  id: c.id,
  requestId: c.request_id,
  authorName: c.author_name,
  body: c.body,
  kind: c.kind,
  createdAt: c.created_at,
})

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new StoreError(res.error.message)
  return res.data as T
}

const REQUEST_SELECT = 'id, event_id, department, details, status, created_at, updated_at, events!inner(*)'

export class SupabaseStore implements Store {
  readonly mode = 'supabase' as const
  private db: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.db = createClient(url, anonKey)
  }

  async submitEvent(event: EventInput, requests: DepartmentRequestInput[]): Promise<SubmitResult> {
    // A SECURITY DEFINER function inserts the event and all requests in one transaction,
    // so the public (anon) role never needs SELECT access to anyone's data.
    const data = check(
      await this.db.rpc('submit_event_request', {
        p_event: {
          requester_name: event.requesterName,
          phone: event.phone,
          email: event.email,
          event_name: event.eventName,
          event_date: event.eventDate,
          requesting_team: event.requestingTeam,
        },
        p_requests: requests,
      }),
    ) as { event_id: string; reference: string }
    return { eventId: data.event_id, reference: data.reference }
  }

  async signIn(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password })
    if (error) throw new StoreError(error.message)
    const user = await this.currentUser()
    if (!user) {
      await this.db.auth.signOut()
      throw new StoreError('This account is not set up as staff yet. Ask an admin to add you.')
    }
    return user
  }

  async signOut() {
    await this.db.auth.signOut()
  }

  async currentUser(): Promise<StaffUser | null> {
    const { data } = await this.db.auth.getUser()
    if (!data.user) return null
    const res = await this.db.from('staff').select('id, email, name, role').eq('id', data.user.id).maybeSingle()
    return (res.data as StaffUser | null) ?? null
  }

  async listRequests(department?: DepartmentId) {
    // Row Level Security limits rows to the user's department (or everything for admins).
    let q = this.db.from('department_requests').select(REQUEST_SELECT)
    if (department) q = q.eq('department', department)
    const rows = check(await q) as unknown as RequestRow[]
    return rows.map(toRequest).sort((a, b) => a.event.eventDate.localeCompare(b.event.eventDate))
  }

  async getRequest(id: string) {
    const row = check(
      await this.db.from('department_requests').select(REQUEST_SELECT).eq('id', id).maybeSingle(),
    ) as unknown as RequestRow | null
    return row ? toRequest(row) : null
  }

  async updateStatus(id: string, status: RequestStatus) {
    // A trigger records the status change in request_comments.
    check(await this.db.from('department_requests').update({ status }).eq('id', id).select('id'))
  }

  async listComments(requestId: string) {
    const rows = check(
      await this.db.from('request_comments').select('*').eq('request_id', requestId).order('created_at'),
    ) as CommentRow[]
    return rows.map(toComment)
  }

  async addComment(requestId: string, body: string, actor: StaffUser) {
    const row = check(
      await this.db
        .from('request_comments')
        .insert({ request_id: requestId, body: body.trim(), author_name: actor.name, kind: 'comment' })
        .select()
        .single(),
    ) as CommentRow
    return toComment(row)
  }
}
