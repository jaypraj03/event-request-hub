/**
 * Runs the real migration in an in-memory Postgres (PGlite) with a tiny stand-in for
 * Supabase's auth schema, then checks the security rules: the public can only submit,
 * and each team only sees its own requests.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const AV = '00000000-0000-0000-0000-0000000000a1'
const KITCHEN = '00000000-0000-0000-0000-0000000000b1'

let db: PGlite

/** Run SQL as a given Supabase role/user, like PostgREST does per request. */
async function as<T = Record<string, unknown>>(role: 'anon' | 'authenticated', userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.sub', '${userId ?? ''}', false); set role ${role};`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec('reset role;')
  }
}

const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
const eventJson = (name: string) =>
  JSON.stringify({
    requester_name: 'Kiran',
    phone: '(713) 555-0142',
    email: 'Kiran@Example.com',
    event_name: name,
    event_date: future,
    requesting_team: 'Youth',
  })

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUBS)
  await db.exec(readFileSync(new URL('./migrations/001_schema.sql', import.meta.url), 'utf8').replace(/create extension[^;]+;/, ''))
  await db.exec(`
    insert into auth.users values ('${ADMIN}','admin@x.org'),('${AV}','av@x.org'),('${KITCHEN}','kitchen@x.org');
    insert into staff values ('${ADMIN}','admin@x.org','Admin','admin'),('${AV}','av@x.org','Arjun','av'),('${KITCHEN}','kitchen@x.org','Meera','kitchen');
  `)
}, 30_000)

describe('public submission', () => {
  it('anon can submit an event with several department requests', async () => {
    const [row] = await as<{ r: { event_id: string; reference: string } }>(
      'anon',
      null,
      `select submit_event_request($1::jsonb, $2::jsonb) as r`,
      [eventJson('Diwali Dinner'), JSON.stringify([{ department: 'av', details: { mics: 2 } }, { department: 'kitchen', details: { headcount: 200 } }])],
    )
    expect(row.r.reference).toMatch(/^EVT-[A-Z2-9]{4}$/)
    const reqs = await db.query('select department from department_requests where event_id = $1 order by department', [row.r.event_id])
    expect(reqs.rows).toEqual([{ department: 'av' }, { department: 'kitchen' }])
    const ev = await db.query<{ email: string }>('select email from events where id = $1', [row.r.event_id])
    expect(ev.rows[0].email).toBe('kiran@example.com')
  })

  it('anon cannot read anything back', async () => {
    await expect(as('anon', null, 'select * from events')).rejects.toThrow(/permission denied/)
    await expect(as('anon', null, 'select * from department_requests')).rejects.toThrow(/permission denied/)
    await expect(as('anon', null, `insert into events (reference, requester_name, phone, email, event_name, event_date, requesting_team) values ('EVT-HACK','x','1','a@b.co','x', current_date, 'x')`)).rejects.toThrow(/permission denied/)
  })

  it('rejects empty submissions, past dates and unknown departments atomically', async () => {
    const before = (await db.query<{ n: number }>('select count(*)::int as n from events')).rows[0].n
    await expect(as('anon', null, `select submit_event_request($1::jsonb, '[]'::jsonb)`, [eventJson('X')])).rejects.toThrow(/At least one/)
    await expect(
      as('anon', null, `select submit_event_request($1::jsonb, $2::jsonb)`, [
        eventJson('Y'),
        JSON.stringify([{ department: 'av', details: {} }, { department: 'balloons', details: {} }]),
      ]),
    ).rejects.toThrow()
    const past = JSON.stringify({ ...JSON.parse(eventJson('Z')), event_date: '2020-01-01' })
    await expect(as('anon', null, `select submit_event_request($1::jsonb, '[{"department":"av"}]'::jsonb)`, [past])).rejects.toThrow(/past/)
    const after = (await db.query<{ n: number }>('select count(*)::int as n from events')).rows[0].n
    expect(after).toBe(before) // nothing half-saved
  })
})

describe('row level security', () => {
  it('each team sees only its own requests; admin sees all', async () => {
    const av = await as<{ department: string }>('authenticated', AV, 'select department from department_requests')
    const kitchen = await as<{ department: string }>('authenticated', KITCHEN, 'select department from department_requests')
    const admin = await as('authenticated', ADMIN, 'select department from department_requests')
    expect(av.every((r) => r.department === 'av')).toBe(true)
    expect(kitchen.every((r) => r.department === 'kitchen')).toBe(true)
    expect(admin.length).toBe(av.length + kitchen.length)
  })

  it('staff can see the parent event of their requests', async () => {
    expect((await as('authenticated', AV, 'select * from events')).length).toBeGreaterThan(0)
  })

  it('staff cannot update another team’s request', async () => {
    const updated = await as('authenticated', AV, `update department_requests set status = 'approved' where department = 'kitchen' returning id`)
    expect(updated).toHaveLength(0)
  })

  it('status changes are logged with the staff member’s name', async () => {
    const [r] = await as<{ id: string }>('authenticated', AV, `update department_requests set status = 'in_review' where department = 'av' returning id`)
    const log = await as<{ body: string; author_name: string; kind: string }>(
      'authenticated',
      AV,
      'select body, author_name, kind from request_comments where request_id = $1',
      [r.id],
    )
    expect(log).toEqual([{ body: 'new→in_review', author_name: 'Arjun', kind: 'status' }])
  })

  it('staff cannot rewrite what the requester asked for', async () => {
    await expect(as('authenticated', AV, `update department_requests set details = '{}' where department = 'av'`)).rejects.toThrow(/permission denied/)
  })

  it('staff cannot delete requests or events', async () => {
    await expect(as('authenticated', ADMIN, `delete from department_requests`)).rejects.toThrow(/permission denied/)
    await expect(as('authenticated', ADMIN, `delete from events`)).rejects.toThrow(/permission denied/)
  })

  it('comment author is stamped from the session and fake status entries are blocked', async () => {
    const [r] = await as<{ id: string }>('authenticated', KITCHEN, `select id from department_requests limit 1`)
    const [c] = await as<{ author_name: string; kind: string }>(
      'authenticated',
      KITCHEN,
      `insert into request_comments (request_id, body, author_name, kind) values ($1, 'Menu set', 'Someone Else', 'status') returning author_name, kind`,
      [r.id],
    )
    expect(c).toEqual({ author_name: 'Meera', kind: 'comment' })
  })

  it('staff cannot comment on another team’s request', async () => {
    const [r] = await as<{ id: string }>('authenticated', KITCHEN, `select id from department_requests limit 1`)
    await expect(
      as('authenticated', AV, `insert into request_comments (request_id, body) values ($1, 'hi')`, [r.id]),
    ).rejects.toThrow(/row-level security/)
  })
})
