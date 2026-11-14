import { DEPARTMENT_BY_ID, isFieldVisible } from './departments'
import type { DepartmentRequestInput, EventInput, FieldValue } from './types'

export type Errors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isBlank(v: FieldValue | undefined) {
  return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
}

export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '')
}

/** Formats as the user types: (555) 123-4567 */
export function formatPhone(input: string) {
  let d = digitsOnly(input)
  if (d.length > 10 && d.startsWith('1')) d = d.slice(1) // drop US country code
  d = d.slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function validateEvent(e: EventInput, today = new Date()): Errors {
  const errors: Errors = {}
  if (!e.requesterName.trim()) errors.requesterName = 'Please enter your name'
  if (digitsOnly(e.phone).length !== 10) errors.phone = 'Enter a 10-digit phone number'
  if (!EMAIL_RE.test(e.email.trim())) errors.email = 'Enter a valid email'
  if (!e.eventName.trim()) errors.eventName = 'Give your event a name'
  if (!e.requestingTeam.trim()) errors.requestingTeam = 'Which team is this for?'
  if (!e.eventDate) {
    errors.eventDate = 'Pick a date'
  } else {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const date = new Date(`${e.eventDate}T00:00:00`)
    if (date < startOfToday) errors.eventDate = 'Event date can’t be in the past'
  }
  return errors
}

/** Errors are keyed `${index}.${fieldKey}` so each request card can find its own. */
export function validateRequests(requests: DepartmentRequestInput[]): Errors {
  const errors: Errors = {}
  if (requests.length === 0) errors.requests = 'Add at least one department request'

  const seen = new Set<string>()
  requests.forEach((req, i) => {
    if (!req.department) {
      errors[`${i}.department`] = 'Choose a department'
      return
    }
    if (seen.has(req.department)) {
      errors[`${i}.department`] = 'You already added a request for this team'
    }
    seen.add(req.department)

    for (const field of DEPARTMENT_BY_ID[req.department].fields) {
      if (!isFieldVisible(field, req.details)) continue
      const value = req.details[field.key]
      if (field.required && isBlank(value)) {
        errors[`${i}.${field.key}`] = 'Required'
        continue
      }
      if (field.type === 'number' && !isBlank(value)) {
        const n = Number(value)
        if (!Number.isFinite(n)) errors[`${i}.${field.key}`] = 'Enter a number'
        else if (field.min !== undefined && n < field.min) errors[`${i}.${field.key}`] = `Must be at least ${field.min}`
      }
    }

    const { startTime, endTime } = req.details
    if (typeof startTime === 'string' && typeof endTime === 'string' && startTime && endTime && endTime <= startTime) {
      errors[`${i}.endTime`] = 'Must be after the start time'
    }
  })
  return errors
}

/** Strip hidden fields and coerce numbers before saving. */
export function cleanRequest(req: DepartmentRequestInput): DepartmentRequestInput {
  const details: Record<string, FieldValue> = {}
  for (const field of DEPARTMENT_BY_ID[req.department].fields) {
    if (!isFieldVisible(field, req.details)) continue
    const value = req.details[field.key]
    if (isBlank(value)) continue
    details[field.key] = field.type === 'number' ? Number(value) : value
  }
  return { department: req.department, details }
}
