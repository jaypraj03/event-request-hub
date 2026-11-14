import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StaffLayout } from '../components/StaffLayout'
import { Button, Card, DepartmentBadge, EmptyState, STATUS_META, Spinner, StatusBadge, cx, inputClass } from '../components/ui'
import { useAuth } from '../lib/auth'
import { store } from '../lib/config'
import { DEPARTMENT_BY_ID, formatDate, formatValue } from '../lib/departments'
import { daysUntil } from '../lib/filters'
import { STATUSES, type Comment, type RequestStatus, type RequestWithEvent } from '../lib/types'

export function RequestDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [request, setRequest] = useState<RequestWithEvent | null | undefined>(undefined)
  const [comments, setComments] = useState<Comment[]>([])
  const [siblings, setSiblings] = useState<RequestWithEvent[]>([])
  const [savingStatus, setSavingStatus] = useState<RequestStatus | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await store.getRequest(id)
    setRequest(r)
    if (r) {
      setComments(await store.listComments(r.id))
      if (user?.role === 'admin') {
        const all = await store.listRequests()
        setSiblings(all.filter((x) => x.eventId === r.eventId && x.id !== r.id))
      }
    }
  }, [id, user?.role])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  async function changeStatus(status: RequestStatus) {
    if (!request || !user) return
    setSavingStatus(status)
    setError('')
    try {
      await store.updateStatus(request.id, status, user)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status')
    } finally {
      setSavingStatus(null)
    }
  }

  if (request === undefined && !error) {
    return (
      <StaffLayout>
        <div className="grid place-items-center py-24 text-navy">
          <Spinner className="h-6 w-6" />
        </div>
      </StaffLayout>
    )
  }

  if (!request) {
    return (
      <StaffLayout>
        <BackLink />
        <div className="mt-6">
          <EmptyState title="Request not found">{error || 'It may belong to another team, or it no longer exists.'}</EmptyState>
        </div>
      </StaffLayout>
    )
  }

  const dept = DEPARTMENT_BY_ID[request.department]
  const e = request.event
  const days = daysUntil(e.eventDate)

  return (
    <StaffLayout>
      <BackLink />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <DepartmentBadge department={request.department} />
            <StatusBadge status={request.status} />
            <span className="font-mono text-xs text-slate-500">{e.reference}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold">{e.eventName}</h1>
          <p className="mt-1 text-slate-600">
            {formatDate(e.eventDate)}
            <span className={cx('ml-2 text-sm', days >= 0 && days <= 3 ? 'font-semibold text-red-600' : 'text-slate-400')}>
              ({days < 0 ? 'past' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`})
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <span aria-hidden>{dept.icon}</span> {dept.name} request
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {dept.fields
                .filter((f) => request.details[f.key] !== undefined)
                .map((f) => (
                  <div key={f.key} className={f.type === 'textarea' || f.type === 'multiselect' ? 'sm:col-span-2' : ''}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{f.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">
                      {f.type === 'multiselect' && Array.isArray(request.details[f.key]) ? (
                        <span className="flex flex-wrap gap-1.5">
                          {(request.details[f.key] as string[]).map((v) => (
                            <span key={v} className="rounded-full bg-cream px-2.5 py-0.5 text-xs">
                              {v}
                            </span>
                          ))}
                        </span>
                      ) : (
                        formatValue(f, request.details[f.key])
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Activity</h2>
            <Timeline comments={comments} createdAt={request.createdAt} requester={e.requesterName} />
            <CommentBox
              onSubmit={async (body) => {
                if (!user) return
                await store.addComment(request.id, body, user)
                setComments(await store.listComments(request.id))
              }}
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Update status</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={savingStatus !== null || s === request.status}
                  onClick={() => changeStatus(s)}
                  className={cx(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-medium transition disabled:cursor-default',
                    s === request.status
                      ? cx('ring-2 ring-inset', STATUS_META[s].className, 'border-transparent')
                      : 'border-line bg-white hover:border-navy/40 disabled:opacity-50',
                  )}
                >
                  {savingStatus === s ? <Spinner className="h-3 w-3" /> : <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_META[s].dot)} />}
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Requester</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="font-medium">{e.requesterName}</div>
              <div className="text-slate-500">{e.requestingTeam}</div>
              <a href={`mailto:${e.email}?subject=${encodeURIComponent(`${e.eventName} (${e.reference})`)}`} className="block text-navy hover:underline">
                {e.email}
              </a>
              <a href={`tel:${e.phone.replace(/\D/g, '')}`} className="block text-navy hover:underline">
                {e.phone}
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Submitted {new Date(e.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </Card>

          {user?.role === 'admin' && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">Other teams on this event</h2>
              {siblings.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Only this team was requested.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {siblings.map((s) => (
                    <li key={s.id}>
                      <Link to={`/staff/requests/${s.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-cream">
                        <DepartmentBadge department={s.department} />
                        <StatusBadge status={s.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </aside>
      </div>
    </StaffLayout>
  )
}

function BackLink() {
  return (
    <Link to="/staff" className="text-sm font-medium text-slate-500 hover:text-navy">
      ← All requests
    </Link>
  )
}

function Timeline({ comments, createdAt, requester }: { comments: Comment[]; createdAt: string; requester: string }) {
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <ol className="mt-4 space-y-4 border-l border-line pl-5">
      <li className="relative">
        <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
        <p className="text-sm">
          <span className="font-medium">{requester}</span> submitted the request
        </p>
        <p className="text-xs text-slate-400">{fmt(createdAt)}</p>
      </li>
      {comments.map((c) => {
        if (c.kind === 'status') {
          const [, to] = c.body.split('→') as [RequestStatus, RequestStatus]
          return (
            <li key={c.id} className="relative">
              <span className={cx('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white', STATUS_META[to]?.dot ?? 'bg-slate-400')} />
              <p className="text-sm">
                <span className="font-medium">{c.authorName}</span> marked this <StatusBadge status={to} />
              </p>
              <p className="text-xs text-slate-400">{fmt(c.createdAt)}</p>
            </li>
          )
        }
        return (
          <li key={c.id} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy ring-4 ring-white" />
            <p className="text-sm">
              <span className="font-medium">{c.authorName}</span> <span className="text-slate-400">· {fmt(c.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-cream px-3.5 py-2.5 text-sm">{c.body}</p>
          </li>
        )
      })}
    </ol>
  )
}

function CommentBox({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    try {
      await onSubmit(body)
      setBody('')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
      <textarea
        aria-label="Add a note"
        rows={2}
        placeholder="Add an internal note for your team…"
        className={cx(inputClass(), 'flex-1')}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit" loading={saving} disabled={!body.trim()}>
        Add note
      </Button>
    </form>
  )
}
