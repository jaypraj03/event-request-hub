import { useState, type FormEvent } from 'react'
import { FieldInput } from '../components/FieldInput'
import { PublicLayout } from '../components/Layout'
import { Button, Card, Field, Input, cx } from '../components/ui'
import { store } from '../lib/config'
import { DEPARTMENTS, DEPARTMENT_BY_ID, emptyDetails, isFieldVisible } from '../lib/departments'
import type { DepartmentId, EventInput, FieldValue, SubmitResult } from '../lib/types'
import { cleanRequest, formatPhone, validateEvent, validateRequests, type Errors } from '../lib/validation'

interface DraftRequest {
  key: number
  department: DepartmentId | ''
  details: Record<string, FieldValue>
}

const emptyEvent: EventInput = {
  requesterName: '',
  phone: '',
  email: '',
  eventName: '',
  eventDate: '',
  requestingTeam: '',
}

let nextKey = 1
const newDraft = (): DraftRequest => ({ key: nextKey++, department: '', details: {} })

export function RequestFormPage() {
  const [event, setEvent] = useState<EventInput>(emptyEvent)
  const [requests, setRequests] = useState<DraftRequest[]>([newDraft()])
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<(SubmitResult & { departments: DepartmentId[]; eventName: string }) | null>(null)

  const setEventField = (key: keyof EventInput, value: string) => {
    setEvent((e) => ({ ...e, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest)
  }

  const updateRequest = (key: number, patch: Partial<DraftRequest>) =>
    setRequests((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const chooseDepartment = (index: number, key: number, department: DepartmentId | '') => {
    updateRequest(key, { department, details: department ? emptyDetails(department) : {} })
    clearRequestErrors(index)
  }

  const setDetail = (index: number, req: DraftRequest, fieldKey: string, value: FieldValue) => {
    updateRequest(req.key, { details: { ...req.details, [fieldKey]: value } })
    const errKey = `${index}.${fieldKey}`
    if (errors[errKey]) setErrors(({ [errKey]: _, ...rest }) => rest)
  }

  const clearRequestErrors = (index: number) =>
    setErrors((errs) => Object.fromEntries(Object.entries(errs).filter(([k]) => !k.startsWith(`${index}.`))))

  const removeRequest = (key: number) => {
    setRequests((rs) => rs.filter((r) => r.key !== key))
    setErrors({}) // indexes shift; re-validate on next submit
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const asInputs = requests.map((r) => ({ department: r.department as DepartmentId, details: r.details }))
    const errs = { ...validateEvent(event), ...validateRequests(asInputs) }
    setErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setSubmitting(true)
    try {
      const cleaned = asInputs.map(cleanRequest)
      const res = await store.submitEvent({ ...event, email: event.email.trim() }, cleaned)
      setResult({ ...res, departments: cleaned.map((r) => r.department), eventName: event.eventName })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setEvent(emptyEvent)
    setRequests([newDraft()])
    setErrors({})
    setResult(null)
  }

  if (result) return <SuccessView result={result} onReset={startOver} />

  const usedDepartments = new Set(requests.map((r) => r.department).filter(Boolean))
  const today = new Date()
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  return (
    <PublicLayout>
      <section className="pt-6 pb-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Event requests
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Submit an event request</h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Tell us about your event and what you need. Add a request for each team — they’ll each get just their part.
        </p>
      </section>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="p-5 sm:p-7">
          <SectionTitle n="01" title="About you & your event" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="requesterName" required error={errors.requesterName}>
              <Input
                id="requesterName"
                autoComplete="name"
                placeholder="First and last name"
                value={event.requesterName}
                invalid={!!errors.requesterName}
                onChange={(e) => setEventField('requesterName', e.target.value)}
              />
            </Field>
            <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(555) 123-4567"
                value={event.phone}
                invalid={!!errors.phone}
                onChange={(e) => setEventField('phone', formatPhone(e.target.value))}
              />
            </Field>
            <Field label="Email" htmlFor="email" required hint="so the team can reach you" error={errors.email} className="sm:col-span-2">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={event.email}
                invalid={!!errors.email}
                onChange={(e) => setEventField('email', e.target.value)}
              />
            </Field>
            <Field label="Event name" htmlFor="eventName" required error={errors.eventName} className="sm:col-span-2">
              <Input
                id="eventName"
                placeholder="What’s the occasion?"
                value={event.eventName}
                invalid={!!errors.eventName}
                onChange={(e) => setEventField('eventName', e.target.value)}
              />
            </Field>
            <Field label="Event date" htmlFor="eventDate" required error={errors.eventDate}>
              <Input
                id="eventDate"
                type="date"
                min={minDate}
                value={event.eventDate}
                invalid={!!errors.eventDate}
                onChange={(e) => setEventField('eventDate', e.target.value)}
              />
            </Field>
            <Field label="Requesting team / ministry" htmlFor="requestingTeam" required error={errors.requestingTeam}>
              <Input
                id="requestingTeam"
                placeholder="e.g. Youth ministry"
                value={event.requestingTeam}
                invalid={!!errors.requestingTeam}
                onChange={(e) => setEventField('requestingTeam', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <SectionTitle n="02" title="What do you need?" />
            <span className="mt-1.5 text-sm text-slate-500">
              {requests.length} request{requests.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {requests.map((req, i) => (
              <div key={req.key} className="animate-rise rounded-2xl border border-line bg-cream/60 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Request {String(i + 1).padStart(2, '0')}
                    {req.department && <span className="ml-2 normal-case tracking-normal text-navy">· {DEPARTMENT_BY_ID[req.department].name}</span>}
                  </span>
                  <div className="flex gap-1">
                    {req.department && (
                      <Button type="button" variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => chooseDepartment(i, req.key, '')}>
                        Change team
                      </Button>
                    )}
                    {requests.length > 1 && (
                      <Button type="button" variant="ghost" className="px-2.5 py-1 text-xs text-red-700 hover:bg-red-50" onClick={() => removeRequest(req.key)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {!req.department ? (
                  <Field label="Department" required error={errors[`${i}.department`]}>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {DEPARTMENTS.map((d) => {
                        const taken = usedDepartments.has(d.id)
                        return (
                          <button
                            type="button"
                            key={d.id}
                            disabled={taken}
                            onClick={() => chooseDepartment(i, req.key, d.id)}
                            className={cx(
                              'group flex items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition',
                              taken ? 'cursor-not-allowed opacity-45' : 'border-line hover:-translate-y-px hover:border-navy/50 hover:shadow-sm',
                            )}
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream text-xl" aria-hidden>
                              {d.icon}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-ink">{d.name}</span>
                              <span className="block text-xs text-slate-500">{taken ? 'Already added' : d.tagline}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {errors[`${i}.department`] && (
                      <p className="text-xs font-medium text-red-600 sm:col-span-2" role="alert">
                        {errors[`${i}.department`]}
                      </p>
                    )}
                    {DEPARTMENT_BY_ID[req.department].fields
                      .filter((f) => isFieldVisible(f, req.details))
                      .map((f) => {
                        const id = `r${req.key}-${f.key}`
                        const err = errors[`${i}.${f.key}`]
                        return (
                          <Field
                            key={f.key}
                            label={f.label}
                            htmlFor={id}
                            required={f.required}
                            error={err}
                            className={f.half ? '' : 'sm:col-span-2'}
                          >
                            <FieldInput id={id} field={f} value={req.details[f.key]} invalid={!!err} onChange={(v) => setDetail(i, req, f.key, v)} />
                            {f.help && !err && <p className="text-xs text-slate-500">{f.help}</p>}
                          </Field>
                        )
                      })}
                  </div>
                )}
              </div>
            ))}

            {requests.length < DEPARTMENTS.length && (
              <button
                type="button"
                onClick={() => setRequests((rs) => [...rs, newDraft()])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-4 text-sm font-medium text-navy transition hover:border-navy/40 hover:bg-white"
              >
                <span className="text-lg leading-none">+</span> Add another request for this event
              </button>
            )}
          </div>
        </Card>

        {submitError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button type="submit" loading={submitting} className="w-full py-3.5 text-base sm:w-auto sm:px-12">
            Submit request
          </Button>
          <p className="text-xs text-slate-500">Each team only receives the part of the form meant for them.</p>
        </div>
      </form>
    </PublicLayout>
  )
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy/8 text-xs font-semibold text-navy ring-1 ring-navy/15">{n}</span>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
    </div>
  )
}

function SuccessView({
  result,
  onReset,
}: {
  result: SubmitResult & { departments: DepartmentId[]; eventName: string }
  onReset: () => void
}) {
  return (
    <PublicLayout>
      <Card className="animate-rise mt-10 p-8 text-center sm:p-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600 ring-1 ring-emerald-200">✓</div>
        <h1 className="mt-5 font-display text-3xl font-semibold">Request submitted</h1>
        <p className="mt-2 text-slate-600">
          <span className="font-medium text-ink">{result.eventName}</span> has been sent to {result.departments.length}{' '}
          team{result.departments.length === 1 ? '' : 's'}.
        </p>
        <div className="mx-auto mt-6 w-fit rounded-xl bg-cream px-5 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Your reference</div>
          <div className="mt-1 font-mono text-2xl font-semibold tracking-wider text-navy">{result.reference}</div>
        </div>
        <ul className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {result.departments.map((d) => (
            <li key={d} className="rounded-full border border-line bg-white px-3 py-1 text-sm">
              {DEPARTMENT_BY_ID[d].icon} {DEPARTMENT_BY_ID[d].name}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate-500">Each team will reach out by email or phone if they have questions.</p>
        <Button variant="secondary" className="mt-6" onClick={onReset}>
          Submit another request
        </Button>
      </Card>
    </PublicLayout>
  )
}
