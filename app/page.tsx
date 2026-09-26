import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { avatarUrl, canConnect, canInvite, INVITATION_URL, missingGitHubSettings, ORG, type OrgStatus } from "@/lib/github";
import { linkFor, linkStatus, type GitHubLink } from "@/lib/links";
import { getMember } from "@/lib/session";
import { cancelGitHub, confirmGitHub, inviteAgain } from "./actions";

const ERRORS: Record<string, string> = {
  github_denied: "You cancelled on GitHub, so nothing was connected.",
  github_failed: "Connecting GitHub didn't work. Try again.",
  github_taken: "That GitHub account is already linked to another Sandbox member.",
  expired: "That took a while, so we need you to connect GitHub again.",
  invite_failed: "GitHub didn't accept the invite. Try again in a minute, or ask an admin.",
};

const button = "rounded-md px-4 py-2 text-sm font-medium";
const primary = `${button} bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200`;
const secondary = `${button} border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`;

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // proxy.ts already sends signed-out people to /login; this is a backstop.
  const member = await getMember();
  if (!member) redirect("/login");
  const { error } = await searchParams;

  const missing = missingGitHubSettings();
  const link = await linkFor(member.sub);
  const [pending] = link
    ? []
    : await sql<{ github_id: string; github_login: string }>`
        select github_id::text as github_id, github_login from github_pending
        where member_sub = ${member.sub} and verified_at > now() - interval '15 minutes'`;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Join Sandbox on GitHub</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Hi {member.name ?? "there"}. Get yourself into the{" "}
            <a href={`https://github.com/${ORG}`} className="underline">
              {ORG}
            </a>{" "}
            GitHub org, no waiting for an admin.
          </p>
        </div>

        {error && ERRORS[error] && <p className="text-sm text-red-600">{ERRORS[error]}</p>}

        {missing.length > 0 && <NotSetUp missing={missing} />}

        {!canConnect() ? null : link ? (
          <Linked memberSub={member.sub} link={link} />
        ) : pending ? (
          <Confirm githubId={pending.github_id} login={pending.github_login} />
        ) : (
          <form action="/api/github/connect" method="post" className="space-y-2">
            <button className={primary}>Connect GitHub</button>
            <p className="text-xs text-neutral-500">
              You&apos;ll sign in to GitHub so we know which account is yours. We only see your
              public profile.
            </p>
          </form>
        )}

        <div className="flex justify-center gap-4 text-sm text-neutral-500">
          {isAdmin(member) && (
            <Link href="/admin" className="underline">
              Who&apos;s joined
            </Link>
          )}
          <form action="/api/auth/logout" method="post">
            <button className="underline">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}

function GitHubAccount({ githubId, login }: { githubId: string; login: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar name={login} picture={avatarUrl(githubId)} size={80} />
      <a href={`https://github.com/${login}`} className="font-medium underline">
        @{login}
      </a>
    </div>
  );
}

function Confirm({ githubId, login }: { githubId: string; login: string }) {
  return (
    <div className="space-y-4">
      <p>Is this your GitHub account?</p>
      <GitHubAccount githubId={githubId} login={login} />
      <p className="text-xs text-neutral-500">
        Each Sandbox member can link one GitHub account, and it can&apos;t be changed here later.
      </p>
      <div className="flex justify-center gap-2">
        <form action={confirmGitHub}>
          <button className={primary}>Yes, invite me</button>
        </form>
        <form action={cancelGitHub}>
          <button className={secondary}>No, that&apos;s not me</button>
        </form>
      </div>
      <p className="text-xs text-neutral-500">
        Wrong account? Sign out of github.com, then connect again.
      </p>
    </div>
  );
}

async function Linked({ memberSub, link }: { memberSub: string; link: GitHubLink }) {
  if (!canInvite()) {
    return (
      <div className="space-y-4">
        <GitHubAccount githubId={link.github_id} login={link.github_login} />
        <p>Your GitHub account is linked. Invites aren&apos;t switched on yet: come back soon.</p>
      </div>
    );
  }

  let status: OrgStatus | null = null;
  try {
    status = await linkStatus(memberSub, link);
  } catch (error) {
    console.error(`Checking GitHub status for member ${memberSub} failed:`, error);
  }

  return (
    <div className="space-y-4">
      <GitHubAccount githubId={link.github_id} login={link.github_login} />
      {status === "member" && (
        <p>
          You&apos;re in the{" "}
          <a href={`https://github.com/${ORG}`} className="underline">
            {ORG}
          </a>{" "}
          org. Welcome!
        </p>
      )}
      {status === "invited" && (
        <div className="space-y-3">
          <p>You&apos;ve been invited. One last step: accept the invite on GitHub.</p>
          <a href={INVITATION_URL} className={`${primary} inline-block`}>
            Accept the invite
          </a>
        </div>
      )}
      {status === "none" && (
        <form action={inviteAgain} className="space-y-3">
          <p>
            There&apos;s no invite waiting for you. It may have expired (they last 7 days), or you
            left the org.
          </p>
          <button className={primary}>Send me an invite</button>
        </form>
      )}
      {status === null && (
        <p className="text-sm text-neutral-500">
          We couldn&apos;t check with GitHub just now. Refresh in a minute.
        </p>
      )}
    </div>
  );
}

function NotSetUp({ missing }: { missing: readonly string[] }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
      <p className="font-medium">GitHub isn&apos;t set up yet</p>
      <p className="mt-1">
        The app needs these settings (in <code>.env.local</code> on your computer, or in Vercel
        online):
      </p>
      <ul className="mt-2 list-disc pl-5 font-mono text-xs">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}
