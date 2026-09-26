-- Everyone who has signed in to this app, so pages can show other members'
-- names and photos. Filled in automatically by getMember() in lib/session.ts.
create table members (
  sub text primary key, -- their Sandbox member id
  name text,
  email text,
  picture text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
