import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StaffLayout } from '../components/StaffLayout'
import { Card, DepartmentBadge, EmptyState, Spinner, StatusBadge, cx, inputClass } from '../components/ui'
import { useAuth } from '../lib/auth'
import { store } from '../lib/config'
import { DEPARTMENTS, DEPARTMENT_BY_ID, formatValue } from '../lib/departments'
import { STATUS_FILTERS, daysUntil, filterRequests, matchesStatus, summarize, type Filters } from '../lib/filters'
import type { RequestWithEvent } from '../lib/types'

export function DashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<RequestWithEvent[] | null>(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({ status: 'open', department: 'all', query: '' })

  useEffect(() => {
    store.listRequests().then(setRequests).catch((e) => setError(e.message))
  }, [])

  const visible = useMemo(() => (requests ? filterRequests(requests, filters) : []), [requests, filters])
  const stats = useMemo(() => summarize(requests ?? []), [requests])
  const isAdmin = user?.role === 'admin'

  const title = !user || user.role === 'admin' ? 'All requests' : `${DEPARTMENT_BY_ID[user.role].name} requests`

  return (
    <StaffLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{title}</h1>
        </div>
        <Link to="/" className="text-sm font-medium text-navy hover:underline">
          Open public form ↗
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New" value={stats.new} tone="text-sky-700" />
        <Stat label="In review" value={stats.inReview} tone="text-amber-700" />
        <Stat label="Approved" value={stats.approved} tone="text-emerald-700" />
        <Stat label="Events in next 7 days" value={stats.thisWeek} tone="text-navy" />
      </div>

      <Card className="mt-6 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => {
              const count = requests?.filter((r) => matchesStatus(r.status, s.id)).length ?? 0
              const active = filters.status === s.id
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilters((f) => ({ ...f, status: s.id }))}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    active ? 'bg-navy text-white' : 'text-slate-600 hover:bg-navy/5',
                  )}
                >
                  {s.label}
                  <span className={cx('ml-1.5 text-xs', active ? 'text-white/70' : 'text-slate-400')}>{count}</span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && (
              <select
                aria-label="Filter by department"
                className={cx(inputClass(), 'py-2 sm:w-44')}
                value={filters.department}
                onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value as Filters['department'] }))}
              >
                <option value="all">All departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="search"
              aria-label="Search requests"
              placeholder="Search event, person, reference…"
              className={cx(inputClass(), 'py-2 sm:w-64')}
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {error ? (
          <EmptyState title="Couldn’t load requests">{error}</EmptyState>
        ) : !requests ? (
          <div className="grid place-items-center py-20 text-navy">
            <Spinner className="h-6 w-6" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing here">
            {requests.length === 0 ? 'No requests have come in yet.' : 'No requests match these filters.'}
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((r) => (
              <RequestRow key={r.id} request={r} showDepartment={isAdmin} />
            ))}
          </ul>
        )}
      </div>
    </StaffLayout>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="px-4 py-3.5">
      <div className={cx('font-display text-3xl font-semibold', tone)}>{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </Card>
  )
}

function RequestRow({ request: r, showDepartment }: { request: RequestWithEvent; showDepartment: boolean }) {
  const d = new Date(`${r.event.eventDate}T12:00:00`)
  const days = daysUntil(r.event.eventDate)
  const dept = DEPARTMENT_BY_ID[r.department]
  const preview = dept.fields
    .filter((f) => f.type !== 'textarea' && r.details[f.key] !== undefined)
    .slice(0, 3)
    .map((f) => `${f.label}: ${formatValue(f, r.details[f.key])}`)

  return (
    <li>
      <Link
        to={`/staff/requests/${r.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-line bg-white/90 p-3.5 transition hover:border-navy/30 hover:shadow-sm sm:p-4"
      >
        <div className="w-14 shrink-0 rounded-xl bg-cream py-2 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {d.toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="font-display text-2xl font-semibold leading-none text-ink">{d.getDate()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-ink group-hover:text-navy">{r.event.eventName}</span>
            {showDepartment && <DepartmentBadge department={r.department} />}
          </div>
          <div className="mt-0.5 text-sm text-slate-500">
            {r.event.requestingTeam} · {r.event.requesterName} · <span className="font-mono text-xs">{r.event.reference}</span>
          </div>
          {preview.length > 0 && <div className="mt-1 hidden truncate text-xs text-slate-400 md:block">{preview.join('  ·  ')}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={r.status} />
          <span className={cx('text-xs', days >= 0 && days <= 3 ? 'font-semibold text-red-600' : 'text-slate-400')}>
            {days < 0 ? 'Past' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          </span>
        </div>
      </Link>
    </li>
  )
}
