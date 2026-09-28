import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { canConnect, canInvite, InviteTokenError, missingGitHubSettings } from "@/lib/github";
import { linkFor, linkStatus } from "@/lib/links";
import { getMember } from "@/lib/session";
import { JoinScreen, type View } from "./join-screen";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // proxy.ts already sends signed-out people to /login; this is a backstop.
  const member = await getMember();
  if (!member) redirect("/login");
  const { error } = await searchParams;

  return <JoinScreen member={member} view={await viewFor(member.sub, isAdmin(member))} error={error} />;
}

// Which step this member is on.
// Admins also see which settings are missing.
async function viewFor(memberSub: string, admin: boolean): Promise<View> {
  if (!canConnect()) return { kind: "setup", missing: admin ? missingGitHubSettings() : [] };

  const link = await linkFor(memberSub);
  if (link) {
    if (!canInvite()) return { kind: "no-invites", githubId: link.github_id, login: link.github_login };
    try {
      // Also refreshes link.github_login if they've renamed their GitHub account.
      const status = await linkStatus(memberSub, link);
      return { kind: status, githubId: link.github_id, login: link.github_login };
    } catch (error) {
      console.error("Checking GitHub org status failed:", error);
      const kind = error instanceof InviteTokenError ? "paused" : "unknown";
      return { kind, githubId: link.github_id, login: link.github_login };
    }
  }

  const [pending] = await sql<{ github_id: string; github_login: string }>`
    select github_id::text as github_id, github_login from github_pending
    where member_sub = ${memberSub} and verified_at > now() - interval '15 minutes'`;
  if (pending) return { kind: "confirm", githubId: pending.github_id, login: pending.github_login };

  return { kind: "connect" };
}
