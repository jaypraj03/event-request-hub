import type { Comment, DepartmentRequest, EventRecord, StaffUser } from '../lib/types'

/** Demo-only accounts. In Supabase mode, staff are real auth users (see supabase/seed.sql). */
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_STAFF: StaffUser[] = [
  { id: 'staff-admin', email: 'admin@demo.org', name: 'Admin', role: 'admin' },
  { id: 'staff-facilities', email: 'facilities@demo.org', name: 'Ravi (Facilities)', role: 'facilities' },
  { id: 'staff-it', email: 'it@demo.org', name: 'Neha (IT)', role: 'it' },
  { id: 'staff-kitchen', email: 'kitchen@demo.org', name: 'Meera (Kitchen)', role: 'kitchen' },
  { id: 'staff-av', email: 'av@demo.org', name: 'Arjun (AV)', role: 'av' },
  { id: 'staff-photo', email: 'photo@demo.org', name: 'Priya (Photo/Video)', role: 'photo' },
  { id: 'staff-parking', email: 'parking@demo.org', name: 'Dev (Parking)', role: 'parking' },
]

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function ago(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

export function seedData() {
  const events: EventRecord[] = [
    {
      id: 'evt-1',
      reference: 'EVT-D1W4',
      requesterName: 'Kiran Patel',
      phone: '(713) 555-0142',
      email: 'kiran@example.com',
      eventName: 'Diwali Community Dinner',
      eventDate: daysFromNow(6),
      requestingTeam: 'Youth ministry',
      createdAt: ago(50),
    },
    {
      id: 'evt-2',
      reference: 'EVT-K7MR',
      requesterName: 'Anita Shah',
      phone: '(281) 555-0199',
      email: 'anita@example.com',
      eventName: 'Children’s Music Recital',
      eventDate: daysFromNow(13),
      requestingTeam: 'Bal Sabha',
      createdAt: ago(26),
    },
    {
      id: 'evt-3',
      reference: 'EVT-H3PZ',
      requesterName: 'Rohan Mehta',
      phone: '(832) 555-0117',
      email: 'rohan@example.com',
      eventName: 'Health & Wellness Fair',
      eventDate: daysFromNow(20),
      requestingTeam: 'Community outreach',
      createdAt: ago(3),
    },
  ]

  const r = (
    id: string,
    eventId: string,
    department: DepartmentRequest['department'],
    status: DepartmentRequest['status'],
    details: DepartmentRequest['details'],
    createdHoursAgo: number,
  ): DepartmentRequest => ({
    id,
    eventId,
    department,
    status,
    details,
    createdAt: ago(createdHoursAgo),
    updatedAt: ago(Math.max(0, createdHoursAgo - 4)),
  })

  const requests: DepartmentRequest[] = [
    r('req-1', 'evt-1', 'kitchen', 'approved', {
      meals: ['Dinner', 'Tea / Coffee'], headcount: 220, serveTime: '19:00',
      dietary: ['Jain', 'No onion / garlic'], allergies: 'Two guests with severe peanut allergy',
    }, 50),
    r('req-2', 'evt-1', 'facilities', 'in_review', {
      rooms: ['Community Hall', 'Kitchen / Dining'], startTime: '16:00', endTime: '22:00',
      tables: 30, chairs: 240, notes: 'Round tables, buffet line along the east wall',
    }, 50),
    r('req-3', 'evt-1', 'av', 'new', {
      room: 'Community Hall', mics: 2, micType: 'Handheld wireless', lighting: 'House lights only',
      projector: true, livestream: false, soundcheck: '17:30', notes: 'Slideshow loop during dinner',
    }, 50),
    r('req-4', 'evt-1', 'parking', 'new', {
      vehicles: 90, reserved: 6, lots: ['North lot', 'Overflow lot'], attendants: 3, arrival: '18:30',
    }, 50),
    r('req-5', 'evt-2', 'av', 'in_review', {
      room: 'Main Assembly Hall', mics: 6, micType: 'Mixed', lighting: 'Full stage lighting',
      projector: false, livestream: true, soundcheck: '14:00', notes: '12 performances, piano on stage left',
    }, 26),
    r('req-6', 'evt-2', 'photo', 'new', {
      services: ['Event photography', 'Highlight reel', 'Flyer / graphic design'],
      coverageStart: '15:00', coverageEnd: '18:00', designDue: daysFromNow(5),
      deliverables: 'Flyer for WhatsApp + Instagram story size; photos of every performer',
    }, 26),
    r('req-7', 'evt-3', 'it', 'new', {
      wifi: true, devices: 60, doorAccess: 'Unlock doors during event', doors: 'Gym side door',
      startTime: '08:00', endTime: '14:00',
    }, 3),
    r('req-8', 'evt-3', 'facilities', 'new', {
      rooms: ['Gym', 'Courtyard'], startTime: '07:30', endTime: '14:30', tables: 40, chairs: 80,
    }, 3),
    r('req-9', 'evt-3', 'kitchen', 'declined', {
      meals: ['Snacks'], headcount: 300, serveTime: '10:00',
    }, 3),
  ]

  const comments: Comment[] = [
    { id: 'c-1', requestId: 'req-1', authorName: 'Meera (Kitchen)', body: 'new→approved', kind: 'status', createdAt: ago(40) },
    { id: 'c-2', requestId: 'req-1', authorName: 'Meera (Kitchen)', body: 'Menu confirmed. Separate nut-free prep station.', kind: 'comment', createdAt: ago(39) },
    { id: 'c-3', requestId: 'req-2', authorName: 'Ravi (Facilities)', body: 'new→in_review', kind: 'status', createdAt: ago(30) },
    { id: 'c-4', requestId: 'req-9', authorName: 'Meera (Kitchen)', body: 'new→declined', kind: 'status', createdAt: ago(2) },
    { id: 'c-5', requestId: 'req-9', authorName: 'Meera (Kitchen)', body: 'Kitchen is booked that morning — please arrange outside catering.', kind: 'comment', createdAt: ago(2) },
  ]

  return { events, requests, comments }
}
