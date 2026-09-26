"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { canInvite, inviteToOrg } from "@/lib/github";
import { linkFor, linkStatus } from "@/lib/links";
import { getMember } from "@/lib/session";

// How long a member has to confirm a GitHub account after signing in with it.
const CONFIRM_WITHIN = "15 minutes";

async function signedInMember() {
  const member = await getMember();
  if (!member) redirect("/login");
  return member;
}

// "Yes, that's me": save the pairing, then send the org invite if needed.
export async function confirmGitHub() {
  const member = await signedInMember();

  const [pending] = await sql<{ github_id: string; github_login: string }>`
    select github_id::text as github_id, github_login from github_pending
    where member_sub = ${member.sub} and verified_at > now() - ${CONFIRM_WITHIN}::interval`;
  if (!pending) redirect("/?error=expired");

  // The unique keys make sure it's one GitHub account per member and one
  // member per GitHub account, even if two people confirm at the same moment.
  const saved = await sql`
    insert into github_links (member_sub, github_id, github_login)
    values (${member.sub}, ${pending.github_id}, ${pending.github_login})
    on conflict do nothing
    returning member_sub`;
  await sql`delete from github_pending where member_sub = ${member.sub}`;
  if (saved.length === 0) {
    const [mine] = await sql`select 1 from github_links where member_sub = ${member.sub}`;
    redirect(mine ? "/" : "/?error=github_taken");
  }

  await inviteIfNeeded(member.sub);
}

// For a member whose invite expired (GitHub invites last 7 days) or failed.
export async function inviteAgain() {
  const member = await signedInMember();
  await inviteIfNeeded(member.sub);
}

// "Not me": forget the GitHub account they just signed in with.
export async function cancelGitHub() {
  const member = await signedInMember();
  await sql`delete from github_pending where member_sub = ${member.sub}`;
  redirect("/");
}

async function inviteIfNeeded(memberSub: string) {
  const link = await linkFor(memberSub);
  if (!link || !canInvite()) redirect("/");

  try {
    if ((await linkStatus(memberSub, link)) === "none") {
      await inviteToOrg(Number(link.github_id));
      await sql`update github_links set invited_at = now() where member_sub = ${memberSub}`;
    }
  } catch (error) {
    console.error(`Inviting member ${memberSub} (GitHub ${link.github_login}) failed:`, error);
    redirect("/?error=invite_failed");
  }
  redirect("/");
}
