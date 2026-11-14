import { describe, expect, it } from 'vitest'
import { emptyDetails } from './departments'
import type { EventInput } from './types'
import { cleanRequest, formatPhone, validateEvent, validateRequests } from './validation'

const today = new Date('2026-11-13T10:00:00')

const goodEvent: EventInput = {
  requesterName: 'Kiran Patel',
  phone: '(713) 555-0142',
  email: 'kiran@example.com',
  eventName: 'Diwali Dinner',
  eventDate: '2026-11-20',
  requestingTeam: 'Youth',
}

describe('validateEvent', () => {
  it('accepts a complete event', () => {
    expect(validateEvent(goodEvent, today)).toEqual({})
  })

  it('flags every missing required field', () => {
    const errors = validateEvent(
      { requesterName: ' ', phone: '', email: '', eventName: '', eventDate: '', requestingTeam: '' },
      today,
    )
    expect(Object.keys(errors).sort()).toEqual(
      ['email', 'eventDate', 'eventName', 'phone', 'requestingTeam', 'requesterName'].sort(),
    )
  })

  it('rejects bad emails and short phone numbers', () => {
    const errors = validateEvent({ ...goodEvent, email: 'kiran@', phone: '555-0142' }, today)
    expect(errors.email).toBeDefined()
    expect(errors.phone).toBeDefined()
  })

  it('rejects past dates but allows today', () => {
    expect(validateEvent({ ...goodEvent, eventDate: '2026-11-12' }, today).eventDate).toBeDefined()
    expect(validateEvent({ ...goodEvent, eventDate: '2026-11-13' }, today).eventDate).toBeUndefined()
  })
})

describe('validateRequests', () => {
  it('requires at least one request', () => {
    expect(validateRequests([]).requests).toBeDefined()
  })

  it('requires a department to be chosen', () => {
    // @ts-expect-error simulating an unfinished card
    expect(validateRequests([{ department: '', details: {} }])['0.department']).toBeDefined()
  })

  it('checks required department fields', () => {
    const errors = validateRequests([{ department: 'kitchen', details: emptyDetails('kitchen') }])
    expect(errors['0.meals']).toBe('Required')
    expect(errors['0.headcount']).toBe('Required')
    expect(errors['0.dietary']).toBeUndefined() // optional
  })

  it('enforces number minimums', () => {
    const errors = validateRequests([
      { department: 'kitchen', details: { meals: ['Lunch'], headcount: '0', serveTime: '12:00' } },
    ])
    expect(errors['0.headcount']).toMatch(/at least 1/)
  })

  it('requires end time after start time', () => {
    const errors = validateRequests([
      { department: 'facilities', details: { rooms: ['Gym'], startTime: '18:00', endTime: '09:00' } },
    ])
    expect(errors['0.endTime']).toBeDefined()
  })

  it('skips hidden conditional fields', () => {
    const errors = validateRequests([
      { department: 'it', details: { wifi: false, devices: '-5', doorAccess: 'No change', startTime: '08:00', endTime: '10:00' } },
    ])
    expect(errors['0.devices']).toBeUndefined()
  })

  it('blocks two requests for the same team', () => {
    const parking = { vehicles: 10 }
    const errors = validateRequests([
      { department: 'parking', details: parking },
      { department: 'parking', details: parking },
    ])
    expect(errors['1.department']).toMatch(/already/)
  })
})

describe('cleanRequest', () => {
  it('drops blanks and hidden fields and converts numbers', () => {
    const cleaned = cleanRequest({
      department: 'it',
      details: { wifi: false, devices: '40', doorAccess: 'No change', doors: '', startTime: '08:00', endTime: '10:00' },
    })
    expect(cleaned.details).toEqual({ wifi: false, doorAccess: 'No change', startTime: '08:00', endTime: '10:00' })

    const withWifi = cleanRequest({ department: 'it', details: { wifi: true, devices: '40' } })
    expect(withWifi.details.devices).toBe(40)
  })
})

describe('formatPhone', () => {
  it('formats progressively', () => {
    expect(formatPhone('713')).toBe('713')
    expect(formatPhone('7135550')).toBe('(713) 555-0')
    expect(formatPhone('+1 713 555 0142')).toBe('(713) 555-0142')
    expect(formatPhone('7135550142')).toBe('(713) 555-0142')
  })
})
