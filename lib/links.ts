import { sql } from "./db";
import { currentLogin, orgStatus } from "./github";

export type GitHubLink = { github_id: string; github_login: string; linked_at: Date; invited_at: Date | null };

export async function linkFor(memberSub: string) {
  const [link] = await sql<GitHubLink>`
    select github_id::text as github_id, github_login, linked_at, invited_at
    from github_links where member_sub = ${memberSub}`;
  return link ?? null;
}

// Whether a linked member is in the org, invited, or neither. Keeps the saved
// username up to date if they've renamed their GitHub account.
export async function linkStatus(memberSub: string, link: GitHubLink) {
  const login = await currentLogin(Number(link.github_id));
  if (login !== link.github_login) {
    await sql`update github_links set github_login = ${login} where member_sub = ${memberSub}`;
    link.github_login = login;
  }
  return orgStatus(login);
}
