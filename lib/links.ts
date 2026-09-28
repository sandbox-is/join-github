import { sql } from "./db";
import { currentLogin, orgStatus, type OrgStatus } from "./github";

export type GitHubLink = {
  github_id: string;
  github_login: string;
  linked_at: Date;
  invited_at: Date | null;
  org_status: OrgStatus | null;
  fresh: boolean; // org_status was checked in the last minute
};

export async function linkFor(memberSub: string) {
  const [link] = await sql<GitHubLink>`
    select github_id::text as github_id, github_login, linked_at, invited_at, org_status,
      coalesce(status_checked_at > now() - interval '1 minute', false) as fresh
    from github_links where member_sub = ${memberSub}`;
  return link ?? null;
}

// Whether a linked member is in the org, invited, or neither. Asks GitHub at
// most once a minute per member unless `recheck`. Also keeps the saved
// username up to date if they've renamed their GitHub account.
export async function linkStatus(memberSub: string, link: GitHubLink, recheck = false): Promise<OrgStatus> {
  if (link.fresh && link.org_status && !recheck) return link.org_status;

  const login = await currentLogin(Number(link.github_id));
  const status = await orgStatus(login);
  await sql`
    update github_links set github_login = ${login}, org_status = ${status}, status_checked_at = now()
    where member_sub = ${memberSub}`;
  link.github_login = login;
  return status;
}

export async function saveStatus(memberSub: string, status: OrgStatus) {
  await sql`update github_links set org_status = ${status}, status_checked_at = now() where member_sub = ${memberSub}`;
}
