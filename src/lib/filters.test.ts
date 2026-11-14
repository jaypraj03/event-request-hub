import { describe, expect, it } from 'vitest'
import { daysUntil, filterRequests, summarize } from './filters'
import { canSee, makeReference } from './store'
import type { RequestWithEvent, StaffUser } from './types'

const today = new Date('2026-11-13T10:00:00')

function req(id: string, overrides: Partial<RequestWithEvent> & { date?: string; name?: string } = {}): RequestWithEvent {
  const { date = '2026-11-20', name = 'Dinner', ...rest } = overrides
  return {
    id,
    eventId: `e-${id}`,
    department: 'av',
    details: {},
    status: 'new',
    createdAt: '',
    updatedAt: '',
    event: {
      id: `e-${id}`,
      reference: `EVT-${id}`,
      requesterName: 'Kiran',
      phone: '',
      email: 'k@example.com',
      eventName: name,
      eventDate: date,
      requestingTeam: 'Youth',
      createdAt: '',
    },
    ...rest,
  }
}

const data = [
  req('A', { status: 'new' }),
  req('B', { status: 'in_review', department: 'kitchen', name: 'Recital' }),
  req('C', { status: 'approved', date: '2026-11-14' }),
  req('D', { status: 'declined', date: '2026-11-15' }),
]

describe('filterRequests', () => {
  it('"open" means new + in review', () => {
    expect(filterRequests(data, { status: 'open', department: 'all', query: '' }).map((r) => r.id)).toEqual(['A', 'B'])
  })

  it('filters by department and search text together', () => {
    expect(filterRequests(data, { status: 'all', department: 'kitchen', query: '' }).map((r) => r.id)).toEqual(['B'])
    expect(filterRequests(data, { status: 'all', department: 'all', query: 'recit' }).map((r) => r.id)).toEqual(['B'])
    expect(filterRequests(data, { status: 'all', department: 'all', query: 'evt-c' }).map((r) => r.id)).toEqual(['C'])
  })
})

describe('summarize', () => {
  it('counts statuses and upcoming non-declined events', () => {
    expect(summarize(data, today)).toEqual({ new: 1, inReview: 1, approved: 1, thisWeek: 3 })
  })
})

describe('daysUntil', () => {
  it('counts calendar days', () => {
    expect(daysUntil('2026-11-13', today)).toBe(0)
    expect(daysUntil('2026-11-14', today)).toBe(1)
    expect(daysUntil('2026-11-10', today)).toBe(-3)
  })
})

describe('access rules', () => {
  const av: StaffUser = { id: '1', email: '', name: '', role: 'av' }
  const admin: StaffUser = { id: '2', email: '', name: '', role: 'admin' }
  it('staff see only their department; admins see all', () => {
    expect(canSee(av, 'av')).toBe(true)
    expect(canSee(av, 'kitchen')).toBe(false)
    expect(canSee(admin, 'kitchen')).toBe(true)
  })
})

describe('makeReference', () => {
  it('produces EVT- plus 4 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(makeReference()).toMatch(/^EVT-[A-HJ-NP-Z2-9]{4}$/)
  })
})
