-- Event Request Hub — database schema
-- Run in Supabase: SQL Editor -> paste -> Run (or `supabase db push`).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.staff (
  id    uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name  text not null,
  role  text not null check (role in ('admin','facilities','it','kitchen','av','photo','parking'))
);

create table public.department_settings (
  department   text primary key check (department in ('facilities','it','kitchen','av','photo','parking')),
  notify_email text -- inbox that gets an email for each new request
);

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  requester_name  text not null check (length(trim(requester_name)) > 0),
  phone           text not null,
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  event_name      text not null check (length(trim(event_name)) > 0),
  event_date      date not null,
  requesting_team text not null,
  created_at      timestamptz not null default now()
);

create table public.department_requests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  department text not null check (department in ('facilities','it','kitchen','av','photo','parking')),
  details    jsonb not null default '{}'::jsonb,
  status     text not null default 'new' check (status in ('new','in_review','approved','completed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, department) -- one request per team per event
);

create index on public.department_requests (department, status);
create index on public.events (event_date);

create table public.request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.department_requests (id) on delete cascade,
  author_id   uuid references public.staff (id) on delete set null,
  author_name text not null default 'Staff',
  body        text not null check (length(trim(body)) > 0),
  kind        text not null default 'comment' check (kind in ('comment','status')),
  created_at  timestamptz not null default now()
);

create index on public.request_comments (request_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

-- Role of the signed-in user, or null for the public. SECURITY DEFINER so policies
-- can call it without recursive RLS checks on the staff table.
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.staff where id = auth.uid()
$$;

create or replace function public.can_see_department(dept text)
returns boolean language sql stable as $$
  select public.current_staff_role() = 'admin' or public.current_staff_role() = dept
$$;

-- ─────────────────────────────────────────────────────────────
-- Public submission (the only thing anonymous users can do)
-- ─────────────────────────────────────────────────────────────

create or replace function public.submit_event_request(p_event jsonb, p_requests jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_event_id  uuid;
  v_reference text;
  v_req       jsonb;
  v_chars     text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if jsonb_typeof(p_requests) <> 'array' or jsonb_array_length(p_requests) = 0 then
    raise exception 'At least one department request is required';
  end if;
  if jsonb_array_length(p_requests) > 6 then
    raise exception 'Too many requests';
  end if;
  if (p_event->>'event_date')::date < current_date then
    raise exception 'Event date cannot be in the past';
  end if;

  -- Short human-friendly reference, retried until unique.
  loop
    v_reference := 'EVT-' || (
      select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '')
      from generate_series(1, 4)
    );
    exit when not exists (select 1 from events where reference = v_reference);
  end loop;

  insert into events (reference, requester_name, phone, email, event_name, event_date, requesting_team)
  values (
    v_reference,
    trim(p_event->>'requester_name'),
    trim(p_event->>'phone'),
    lower(trim(p_event->>'email')),
    trim(p_event->>'event_name'),
    (p_event->>'event_date')::date,
    trim(p_event->>'requesting_team')
  )
  returning id into v_event_id;

  for v_req in select * from jsonb_array_elements(p_requests) loop
    insert into department_requests (event_id, department, details)
    values (v_event_id, v_req->>'department', coalesce(v_req->'details', '{}'::jsonb));
  end loop;

  return jsonb_build_object('event_id', v_event_id, 'reference', v_reference);
end;
$$;

revoke all on function public.submit_event_request(jsonb, jsonb) from public;
grant execute on function public.submit_event_request(jsonb, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Triggers: keep updated_at fresh and log status changes
-- ─────────────────────────────────────────────────────────────

create or replace function public.on_request_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    perform set_config('app.status_log', 'on', true);
    insert into request_comments (request_id, author_id, author_name, body, kind)
    values (
      new.id,
      auth.uid(),
      coalesce((select name from staff where id = auth.uid()), 'System'),
      old.status || '→' || new.status,
      'status'
    );
    perform set_config('app.status_log', 'off', true);
  end if;
  return new;
end;
$$;

create trigger request_status_change
before update on public.department_requests
for each row execute function public.on_request_status_change();

-- Staff can only change the status column, not rewrite what the requester asked for.
create or replace function public.prevent_detail_edits()
returns trigger language plpgsql as $$
begin
  if new.details is distinct from old.details
     or new.event_id is distinct from old.event_id
     or new.department is distinct from old.department then
    raise exception 'Only status can be updated';
  end if;
  return new;
end;
$$;

create trigger request_prevent_detail_edits
before update on public.department_requests
for each row execute function public.prevent_detail_edits();

-- Stamp the comment author from the session, ignoring whatever the client sent.
create or replace function public.stamp_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    new.author_name := coalesce((select name from staff where id = auth.uid()), 'Staff');
    -- Only the status-change trigger above may write 'status' entries.
    if new.kind = 'status' and coalesce(current_setting('app.status_log', true), 'off') <> 'on' then
      new.kind := 'comment';
    end if;
  end if;
  return new;
end;
$$;

create trigger comment_author
before insert on public.request_comments
for each row execute function public.stamp_comment_author();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: each team only sees its own part
-- ─────────────────────────────────────────────────────────────

alter table public.staff               enable row level security;
alter table public.department_settings enable row level security;
alter table public.events              enable row level security;
alter table public.department_requests enable row level security;
alter table public.request_comments    enable row level security;

create policy "staff read self, admins read all" on public.staff
  for select to authenticated
  using (id = auth.uid() or public.current_staff_role() = 'admin');

create policy "admins manage settings" on public.department_settings
  for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

create policy "staff read events they have a request for" on public.events
  for select to authenticated
  using (exists (
    select 1 from public.department_requests r
    where r.event_id = events.id and public.can_see_department(r.department)
  ));

create policy "staff read own department requests" on public.department_requests
  for select to authenticated
  using (public.can_see_department(department));

create policy "staff update own department requests" on public.department_requests
  for update to authenticated
  using (public.can_see_department(department))
  with check (public.can_see_department(department));

create policy "staff read comments on visible requests" on public.request_comments
  for select to authenticated
  using (exists (
    select 1 from public.department_requests r
    where r.id = request_comments.request_id and public.can_see_department(r.department)
  ));

create policy "staff comment on visible requests" on public.request_comments
  for insert to authenticated
  with check (exists (
    select 1 from public.department_requests r
    where r.id = request_comments.request_id and public.can_see_department(r.department)
  ));

-- ─────────────────────────────────────────────────────────────
-- Privileges (least privilege; the project does not auto-expose tables)
-- The public (anon) gets no table access at all — only submit_event_request().
-- ─────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant execute on function public.current_staff_role()        to authenticated;
grant execute on function public.can_see_department(text)    to authenticated;

grant select on public.staff, public.events, public.department_requests, public.request_comments to authenticated;
grant update (status) on public.department_requests to authenticated;          -- status only
grant insert (request_id, body, author_name, kind) on public.request_comments to authenticated;
grant select, insert, update, delete on public.department_settings to authenticated; -- RLS: admins only
