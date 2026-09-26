-- Which GitHub account belongs to which Sandbox member. One each way: a
-- member has at most one GitHub account, and a GitHub account belongs to at
-- most one member.
create table github_links (
  member_sub text primary key references members (sub), -- their Sandbox member id
  github_id bigint not null unique, -- GitHub's permanent id (usernames can change)
  github_login text not null, -- their GitHub username when they linked
  linked_at timestamptz not null default now(),
  invited_at timestamptz -- when this app last sent the org invite; empty if none was needed
);

-- A GitHub account a member has just signed in with, waiting for them to
-- confirm it's theirs. Replaced if they connect again; removed on confirm.
create table github_pending (
  member_sub text primary key references members (sub),
  github_id bigint not null,
  github_login text not null,
  verified_at timestamptz not null default now()
);
