import { canSee, makeReference, StoreError, type Store } from './store'
import { DEMO_STAFF, DEMO_PASSWORD, seedData } from '../data/seed'
import type {
  Comment,
  DepartmentId,
  DepartmentRequest,
  DepartmentRequestInput,
  EventInput,
  EventRecord,
  RequestStatus,
  RequestWithEvent,
  StaffUser,
  SubmitResult,
} from './types'

interface DB {
  events: EventRecord[]
  requests: DepartmentRequest[]
  comments: Comment[]
}

const DB_KEY = 'erh.demo.db.v1'
const SESSION_KEY = 'erh.demo.session'

/** Storage can be missing or throw (private mode, sandboxed iframes) — fall back to memory. */
const memory = new Map<string, string>()
const storage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key) ?? memory.get(key) ?? null
    } catch {
      return memory.get(key) ?? null
    }
  },
  set(key: string, value: string) {
    memory.set(key, value)
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* memory only */
    }
  },
  remove(key: string) {
    memory.delete(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

export class LocalStore implements Store {
  readonly mode = 'demo' as const

  private load(): DB {
    const raw = storage.get(DB_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as DB
      } catch {
        /* reseed below */
      }
    }
    const db = seedData()
    this.save(db)
    return db
  }

  private save(db: DB) {
    storage.set(DB_KEY, JSON.stringify(db))
  }

  private join(db: DB, r: DepartmentRequest): RequestWithEvent {
    const event = db.events.find((e) => e.id === r.eventId)
    if (!event) throw new StoreError('Event not found')
    return { ...r, event }
  }

  async submitEvent(event: EventInput, requests: DepartmentRequestInput[]): Promise<SubmitResult> {
    await delay(500)
    const db = this.load()
    const now = new Date().toISOString()
    const record: EventRecord = { ...event, id: uid(), reference: makeReference(), createdAt: now }
    db.events.push(record)
    for (const r of requests) {
      db.requests.push({
        id: uid(),
        eventId: record.id,
        department: r.department,
        details: r.details,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      })
    }
    this.save(db)
    return { eventId: record.id, reference: record.reference }
  }

  async signIn(email: string, password: string): Promise<StaffUser> {
    await delay()
    const user = DEMO_STAFF.find((s) => s.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || password !== DEMO_PASSWORD) throw new StoreError('Invalid email or password')
    storage.set(SESSION_KEY, user.id)
    return user
  }

  async signOut() {
    storage.remove(SESSION_KEY)
  }

  async currentUser() {
    const id = storage.get(SESSION_KEY)
    return DEMO_STAFF.find((s) => s.id === id) ?? null
  }

  private async requireUser() {
    const user = await this.currentUser()
    if (!user) throw new StoreError('Not signed in')
    return user
  }

  async listRequests(department?: DepartmentId) {
    await delay(150)
    const user = await this.requireUser()
    const db = this.load()
    return db.requests
      .filter((r) => canSee(user, r.department) && (!department || r.department === department))
      .map((r) => this.join(db, r))
      .sort((a, b) => a.event.eventDate.localeCompare(b.event.eventDate))
  }

  async getRequest(id: string) {
    const user = await this.requireUser()
    const db = this.load()
    const r = db.requests.find((x) => x.id === id)
    if (!r || !canSee(user, r.department)) return null
    return this.join(db, r)
  }

  async updateStatus(id: string, status: RequestStatus, actor: StaffUser) {
    await delay(150)
    const db = this.load()
    const r = db.requests.find((x) => x.id === id)
    if (!r || !canSee(actor, r.department)) throw new StoreError('Request not found')
    if (r.status === status) return
    const now = new Date().toISOString()
    db.comments.push({
      id: uid(),
      requestId: id,
      authorName: actor.name,
      body: `${r.status}→${status}`,
      kind: 'status',
      createdAt: now,
    })
    r.status = status
    r.updatedAt = now
    this.save(db)
  }

  async listComments(requestId: string) {
    const db = this.load()
    return db.comments
      .filter((c) => c.requestId === requestId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async addComment(requestId: string, body: string, actor: StaffUser) {
    await delay(150)
    const db = this.load()
    const r = db.requests.find((x) => x.id === requestId)
    if (!r || !canSee(actor, r.department)) throw new StoreError('Request not found')
    const comment: Comment = {
      id: uid(),
      requestId,
      authorName: actor.name,
      body: body.trim(),
      kind: 'comment',
      createdAt: new Date().toISOString(),
    }
    db.comments.push(comment)
    this.save(db)
    return comment
  }

  /** Demo helper: wipe local data back to the seed. */
  reset() {
    storage.remove(DB_KEY)
  }
}
