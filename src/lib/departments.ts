import type { DepartmentId, FieldValue } from './types'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'time'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'toggle'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  help?: string
  min?: number
  /** Field is only shown (and validated) when another field is truthy. */
  showIf?: string
  /** Lay the field out at half width on larger screens. */
  half?: boolean
}

export interface DepartmentDef {
  id: DepartmentId
  name: string
  tagline: string
  icon: string // emoji keeps the bundle dependency-free
  accent: string // tailwind color family used for badges
  fields: FieldDef[]
}

const ROOMS = [
  'Main Assembly Hall',
  'Community Hall',
  'Classroom A',
  'Classroom B',
  'Classroom C',
  'Gym',
  'Courtyard',
  'Kitchen / Dining',
]

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 'facilities',
    name: 'Facilities',
    tagline: 'AC & heating for your rooms',
    icon: '🏛️',
    accent: 'emerald',
    fields: [
      { key: 'rooms', label: 'Rooms needed', type: 'multiselect', options: ROOMS, required: true },
      { key: 'startTime', label: 'Climate on from', type: 'time', required: true, half: true },
      { key: 'endTime', label: 'Climate off at', type: 'time', required: true, half: true },
      { key: 'tables', label: 'Tables', type: 'number', min: 0, half: true },
      { key: 'chairs', label: 'Chairs', type: 'number', min: 0, half: true },
      { key: 'notes', label: 'Setup notes', type: 'textarea', placeholder: 'Stage layout, room arrangement…' },
    ],
  },
  {
    id: 'it',
    name: 'IT / Network',
    tagline: 'Door access & event Wi-Fi',
    icon: '📶',
    accent: 'sky',
    fields: [
      { key: 'wifi', label: 'Guest Wi-Fi needed', type: 'toggle' },
      { key: 'devices', label: 'Expected devices on Wi-Fi', type: 'number', min: 1, showIf: 'wifi', half: true },
      {
        key: 'doorAccess',
        label: 'Door access',
        type: 'select',
        required: true,
        options: ['No change', 'Unlock doors during event', 'Temporary badges for guests'],
        half: true,
      },
      { key: 'doors', label: 'Which doors?', type: 'text', placeholder: 'e.g. North entrance, Gym side door' },
      { key: 'startTime', label: 'Access from', type: 'time', required: true, half: true },
      { key: 'endTime', label: 'Access until', type: 'time', required: true, half: true },
      { key: 'notes', label: 'Other IT needs', type: 'textarea' },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    tagline: 'Meals, headcount & allergies',
    icon: '🍲',
    accent: 'orange',
    fields: [
      {
        key: 'meals',
        label: 'Meals',
        type: 'multiselect',
        required: true,
        options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Tea / Coffee'],
      },
      { key: 'headcount', label: 'Headcount', type: 'number', required: true, min: 1, half: true },
      { key: 'serveTime', label: 'Serving time', type: 'time', required: true, half: true },
      {
        key: 'dietary',
        label: 'Dietary requirements',
        type: 'multiselect',
        options: ['Jain', 'No onion / garlic', 'Gluten-free', 'Nut-free', 'Vegan'],
      },
      { key: 'allergies', label: 'Allergy notes', type: 'textarea', placeholder: 'List any allergies the kitchen must know about' },
    ],
  },
  {
    id: 'av',
    name: 'Audio / Video',
    tagline: 'Mics, screens, lighting',
    icon: '🎤',
    accent: 'violet',
    fields: [
      { key: 'room', label: 'Room', type: 'select', options: ROOMS, required: true, half: true },
      { key: 'mics', label: 'Microphones', type: 'number', min: 0, required: true, half: true },
      {
        key: 'micType',
        label: 'Mic type',
        type: 'select',
        options: ['Handheld wireless', 'Lapel', 'Podium', 'Mixed'],
        half: true,
      },
      {
        key: 'lighting',
        label: 'Lighting',
        type: 'select',
        options: ['House lights only', 'Stage wash', 'Full stage lighting'],
        half: true,
      },
      { key: 'projector', label: 'Projector / screens', type: 'toggle', half: true },
      { key: 'livestream', label: 'Livestream', type: 'toggle', half: true },
      { key: 'soundcheck', label: 'Soundcheck time', type: 'time', half: true },
      { key: 'notes', label: 'Program / run-of-show notes', type: 'textarea' },
    ],
  },
  {
    id: 'photo',
    name: 'Photo / Video',
    tagline: 'Design studio, photo & video',
    icon: '📸',
    accent: 'rose',
    fields: [
      {
        key: 'services',
        label: 'Services',
        type: 'multiselect',
        required: true,
        options: ['Event photography', 'Videography', 'Flyer / graphic design', 'Social media post', 'Highlight reel'],
      },
      { key: 'coverageStart', label: 'Coverage from', type: 'time', half: true },
      { key: 'coverageEnd', label: 'Coverage until', type: 'time', half: true },
      { key: 'designDue', label: 'Design needed by', type: 'date', half: true, help: 'Give the studio at least 7 days' },
      { key: 'deliverables', label: 'What should we deliver?', type: 'textarea', placeholder: 'Shot list, sizes, wording for flyers…' },
    ],
  },
  {
    id: 'parking',
    name: 'Parking',
    tagline: 'Lots, reserved spots & attendants',
    icon: '🅿️',
    accent: 'amber',
    fields: [
      { key: 'vehicles', label: 'Expected vehicles', type: 'number', min: 1, required: true, half: true },
      { key: 'reserved', label: 'Reserved spots', type: 'number', min: 0, half: true },
      { key: 'lots', label: 'Lots', type: 'multiselect', options: ['North lot', 'South lot', 'Overflow lot', 'Street'] },
      { key: 'attendants', label: 'Attendants needed', type: 'number', min: 0, half: true },
      { key: 'arrival', label: 'Peak arrival time', type: 'time', half: true },
      { key: 'notes', label: 'Guest / VIP notes', type: 'textarea' },
    ],
  },
]

export const DEPARTMENT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d])) as Record<
  DepartmentId,
  DepartmentDef
>

export function emptyValue(field: FieldDef): FieldValue {
  switch (field.type) {
    case 'multiselect':
      return []
    case 'toggle':
      return false
    default:
      return ''
  }
}

export function emptyDetails(department: DepartmentId) {
  return Object.fromEntries(DEPARTMENT_BY_ID[department].fields.map((f) => [f.key, emptyValue(f)]))
}

export function isFieldVisible(field: FieldDef, details: Record<string, FieldValue>) {
  return !field.showIf || Boolean(details[field.showIf])
}

/** Human-readable value for dashboards and emails. */
export function formatValue(field: FieldDef, value: FieldValue | undefined): string {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return '—'
  if (field.type === 'toggle') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (field.type === 'time' && typeof value === 'string') return formatTime(value)
  if (field.type === 'date' && typeof value === 'string') return formatDate(value)
  return String(value)
}

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
