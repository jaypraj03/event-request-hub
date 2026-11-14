import type { DepartmentId, RequestStatus, RequestWithEvent } from './types'

export type StatusFilter = 'open' | 'all' | RequestStatus

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'approved', label: 'Approved' },
  { id: 'completed', label: 'Completed' },
  { id: 'declined', label: 'Declined' },
  { id: 'all', label: 'All' },
]

export const OPEN_STATUSES: RequestStatus[] = ['new', 'in_review']

export interface Filters {
  status: StatusFilter
  department: DepartmentId | 'all'
  query: string
}

export function matchesStatus(status: RequestStatus, filter: StatusFilter) {
  if (filter === 'all') return true
  if (filter === 'open') return OPEN_STATUSES.includes(status)
  return status === filter
}

export function filterRequests(requests: RequestWithEvent[], f: Filters) {
  const q = f.query.trim().toLowerCase()
  return requests.filter((r) => {
    if (!matchesStatus(r.status, f.status)) return false
    if (f.department !== 'all' && r.department !== f.department) return false
    if (!q) return true
    const e = r.event
    return [e.eventName, e.requesterName, e.requestingTeam, e.reference, e.email].some((s) => s.toLowerCase().includes(q))
  })
}

/** Whole days from today to the event (negative = past). */
export function daysUntil(isoDate: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`)
  return Math.round((date.getTime() - start.getTime()) / 86_400_000)
}

export function summarize(requests: RequestWithEvent[], today = new Date()) {
  return {
    new: requests.filter((r) => r.status === 'new').length,
    inReview: requests.filter((r) => r.status === 'in_review').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    thisWeek: requests.filter((r) => {
      const d = daysUntil(r.event.eventDate, today)
      return d >= 0 && d <= 7 && r.status !== 'declined'
    }).length,
  }
}
