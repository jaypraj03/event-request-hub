# Event Request Hub

A full-stack web app that replaces scattered emails and texts for event planning at a community center. A requester fills in **one form** for their event, adds a request for each department they need (Facilities, IT, Kitchen, Audio/Video, Photo/Video, Parking), and **each team only receives its own part** in a dashboard where it can review, approve and comment.

**Live app:** https://event-request-hub.vercel.app — submit a request on the home page; staff sign in at **Staff login**. (Run `npm run dev` without env vars for a self-contained demo with sample data.)

<!-- Add a screenshot: save it as docs/screenshot.png and replace this line with ![screenshot](docs/screenshot.png) -->

## Features

**Public request form**
- Event details entered once, then any number of department requests
- Each department has its own fields (headcount and allergies for Kitchen, mics and lighting for AV, and so on), driven by one config file
- Conditional fields (e.g. "devices on Wi-Fi" only appears if guest Wi-Fi is on)
- Inline validation: phone formatting, email, no past dates, end time after start time, no duplicate teams
- Confirmation screen with a short reference code (e.g. `EVT-7K3Q`)

**Staff dashboards**
- Email/password sign-in; each staff account belongs to one department, or is an admin
- Department staff only ever see their own team's requests (enforced in the database, not just the UI)
- Status workflow: New → In review → Approved / Declined → Completed
- Filters by status and department, search by event, person or reference
- Summary cards and "event is in 3 days" urgency flags
- Activity timeline with automatic status-change history and internal notes
- Admins can see how every team is responding to the same event

**Notifications** — a Supabase Edge Function emails the right department inbox when a new request arrives.

## Tech stack

| Layer | Tools |
| --- | --- |
| Front end | React 19, TypeScript, Vite, Tailwind CSS v4, React Router |
| Back end | Supabase: Postgres, Auth, Row Level Security, Edge Functions (Deno) |
| Email | Resend API |
| Testing | Vitest (unit tests) and PGlite (runs the real SQL migration in-memory to test security rules) |
| Hosting | Any static host (Vercel, Netlify, GitHub Pages) |

## How it works

```
Requester ──► React form ──► submit_event_request() ──► events + department_requests
                              (one Postgres transaction)          │
                                                                  ├─► webhook ─► Edge Function ─► email to team
Staff ──► sign in ──► dashboard ──► SELECT (Row Level Security filters to their department)
```

- **The public can only submit.** Anonymous users call one `SECURITY DEFINER` function that inserts the event and all its requests atomically. They have no read access to any table.
- **Each team only sees its own part.** Row Level Security policies check the signed-in user's role on every query, so even a hand-crafted API call can't read another team's requests.
- **History can't be forged.** Triggers write status changes to the activity log, stamp comment authors from the session, and block edits to what the requester submitted.
- **Swappable data layer.** The UI talks to a `Store` interface. `SupabaseStore` is used when env vars are set; otherwise `LocalStore` runs a full demo in the browser with seeded data.

## Project structure

```
src/
  lib/
    departments.ts     # one config drives each department's form fields, validation and display
    validation.ts      # pure validation functions (unit tested)
    filters.ts         # dashboard filtering and stats (unit tested)
    store.ts           # Store interface
    supabaseStore.ts   # real backend
    localStore.ts      # demo backend (localStorage)
    auth.tsx           # auth context + protected routes
  pages/               # RequestForm, StaffLogin, Dashboard, RequestDetail
  components/          # UI primitives, dynamic FieldInput, layouts
supabase/
  migrations/001_schema.sql        # tables, RLS policies, triggers, submit function
  schema.test.ts                   # security tests against the real schema
  functions/notify-department/     # email Edge Function
  seed.sql                         # link staff accounts to departments
```

## Run it locally

```bash
npm install
npm run dev        # demo mode, no backend needed
npm test           # 30 tests: validation, filters and database security
npm run build
```

## Connect a real database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run `supabase/migrations/001_schema.sql`.
3. **Authentication → Users → Add user** for each staff member, then edit and run `supabase/seed.sql` to give each one a department.
4. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. `npm run dev`. The demo banner disappears and data now lives in Postgres.

**Email notifications (optional):**
```bash
supabase functions deploy notify-department
supabase secrets set RESEND_API_KEY=... FROM_EMAIL=requests@yourorg.org APP_URL=https://your-app.vercel.app
```
Then in **Database → Webhooks**, add a webhook on `INSERT` into `department_requests` that calls the function.

## Deploy

Push to GitHub, import the repo in [Vercel](https://vercel.com), add the two `VITE_SUPABASE_*` env vars, and deploy. The app uses hash routing, so no rewrite rules are needed.

## Ideas for next steps

- Calendar view of upcoming events across teams
- Let requesters check their request status with their reference code
- Room double-booking detection
- Export a team's weekly schedule to PDF or iCal
