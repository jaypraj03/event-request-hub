// Supabase Edge Function: emails a department when a new request lands.
// Trigger: Database Webhook on INSERT into public.department_requests -> this function.
// Secrets:  supabase secrets set RESEND_API_KEY=... APP_URL=https://your-app.vercel.app FROM_EMAIL=requests@yourorg.org
import { createClient } from 'npm:@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: { id: string; event_id: string; department: string; details: Record<string, unknown> }
}

const DEPARTMENT_NAMES: Record<string, string> = {
  facilities: 'Facilities',
  it: 'IT / Network',
  kitchen: 'Kitchen',
  av: 'Audio / Video',
  photo: 'Photo / Video',
  parking: 'Parking',
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

Deno.serve(async (req) => {
  const payload = (await req.json()) as WebhookPayload
  if (payload.type !== 'INSERT' || payload.table !== 'department_requests') {
    return new Response('ignored', { status: 200 })
  }

  // Service role bypasses RLS — this runs server-side only.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { record } = payload

  const [{ data: settings }, { data: event }] = await Promise.all([
    db.from('department_settings').select('notify_email').eq('department', record.department).maybeSingle(),
    db.from('events').select('*').eq('id', record.event_id).single(),
  ])

  if (!settings?.notify_email || !event) return new Response('no recipient', { status: 200 })

  const rows = Object.entries(record.details)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escape(k)}</td><td>${escape(Array.isArray(v) ? v.join(', ') : String(v))}</td></tr>`)
    .join('')

  const appUrl = Deno.env.get('APP_URL') ?? ''
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL'),
      to: settings.notify_email,
      reply_to: event.email,
      subject: `[${DEPARTMENT_NAMES[record.department]}] ${event.event_name} — ${event.event_date} (${event.reference})`,
      html: `
        <h2>${escape(event.event_name)}</h2>
        <p>${escape(event.event_date)} · requested by ${escape(event.requester_name)} (${escape(event.requesting_team)})<br/>
        ${escape(event.phone)} · ${escape(event.email)}</p>
        <table>${rows}</table>
        <p><a href="${appUrl}/#/staff/requests/${record.id}">Open in dashboard →</a></p>`,
    }),
  })

  return new Response(res.ok ? 'sent' : await res.text(), { status: res.ok ? 200 : 502 })
})
