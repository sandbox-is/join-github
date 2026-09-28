"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { canInvite, InviteTokenError, inviteToOrg } from "@/lib/github";
import { linkFor, linkStatus, saveStatus } from "@/lib/links";
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

  // One attempt a minute per member: two clicks (or tabs) at once would
  // otherwise both see "no invite" and both try to send one.
  const claimed = await sql`
    update github_links set invite_attempted_at = now()
    where member_sub = ${memberSub}
      and (invite_attempted_at is null or invite_attempted_at < now() - interval '1 minute')
    returning 1`;
  if (claimed.length === 0) redirect("/");

  let error: string | undefined;
  try {
    if ((await linkStatus(memberSub, link, true)) === "none") {
      await inviteToOrg(Number(link.github_id));
      await sql`update github_links set invited_at = now() where member_sub = ${memberSub}`;
      await saveStatus(memberSub, "invited");
    }
  } catch (failure) {
    console.error("Sending a GitHub invite failed:", failure);
    // It may have gone through anyway, so check before saying it didn't.
    const status = await linkStatus(memberSub, link, true).catch(() => null);
    if (status !== "invited" && status !== "member") {
      error = failure instanceof InviteTokenError ? "invites_paused" : "invite_failed";
    }
  }
  redirect(error ? `/?error=${error}` : "/");
}
