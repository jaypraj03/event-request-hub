-- After creating staff accounts in Supabase -> Authentication -> Users -> "Add user",
-- link each one to a role here. Replace the emails with your real staff emails.

insert into public.staff (id, email, name, role)
select id, email, 'Admin', 'admin' from auth.users where email = 'admin@yourorg.org'
on conflict (id) do update set role = excluded.role;

insert into public.staff (id, email, name, role)
select id, email, 'AV Team', 'av' from auth.users where email = 'av@yourorg.org'
on conflict (id) do update set role = excluded.role;

-- Repeat for: facilities, it, kitchen, photo, parking

-- Where each department's "new request" emails go (used by the notify-department function).
insert into public.department_settings (department, notify_email) values
  ('facilities', 'facilities@yourorg.org'),
  ('it',         'it@yourorg.org'),
  ('kitchen',    'kitchen@yourorg.org'),
  ('av',         'av@yourorg.org'),
  ('photo',      'photo@yourorg.org'),
  ('parking',    'parking@yourorg.org')
on conflict (department) do update set notify_email = excluded.notify_email;
