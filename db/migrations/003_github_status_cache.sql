-- The member's last-known place in the org, so page loads don't ask GitHub
-- every time (all members share the org token's GitHub rate limit).
alter table github_links add column org_status text; -- 'member', 'invited' or 'none'
alter table github_links add column status_checked_at timestamptz;
-- When the app last started sending an invite, so two clicks at once can't
-- both send one.
alter table github_links add column invite_attempted_at timestamptz;
