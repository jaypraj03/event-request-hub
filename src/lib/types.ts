export const DEPARTMENT_IDS = [
  'facilities',
  'it',
  'kitchen',
  'av',
  'photo',
  'parking',
] as const

export type DepartmentId = (typeof DEPARTMENT_IDS)[number]

export const STATUSES = ['new', 'in_review', 'approved', 'completed', 'declined'] as const
export type RequestStatus = (typeof STATUSES)[number]

export type FieldValue = string | number | boolean | string[]
export type Details = Record<string, FieldValue>

/** Section 01 of the form: who is asking and for which event. */
export interface EventInput {
  requesterName: string
  phone: string
  email: string
  eventName: string
  eventDate: string // yyyy-mm-dd
  requestingTeam: string
}

/** One department's slice of the form. */
export interface DepartmentRequestInput {
  department: DepartmentId
  details: Details
}

export interface EventRecord extends EventInput {
  id: string
  reference: string
  createdAt: string
}

export interface DepartmentRequest {
  id: string
  eventId: string
  department: DepartmentId
  details: Details
  status: RequestStatus
  createdAt: string
  updatedAt: string
}

/** A department request joined with its parent event — what staff see. */
export interface RequestWithEvent extends DepartmentRequest {
  event: EventRecord
}

export interface Comment {
  id: string
  requestId: string
  authorName: string
  body: string
  kind: 'comment' | 'status'
  createdAt: string
}

export type StaffRole = DepartmentId | 'admin'

export interface StaffUser {
  id: string
  email: string
  name: string
  role: StaffRole
}

export interface SubmitResult {
  eventId: string
  reference: string
}
