import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Mark } from "@/components/logo";
import { avatarUrl, INVITATION_URL, ORG } from "@/lib/github";
import { cancelGitHub, confirmGitHub, inviteAgain } from "./actions";

// Everything the home page can show, worked out by app/page.tsx. Kept apart
// from the data so each step can be previewed (app/preview/page.tsx).
export type View =
  | { kind: "setup"; missing: readonly string[] }
  | { kind: "connect" }
  | { kind: "confirm"; githubId: string; login: string }
  | { kind: "no-invites"; githubId: string; login: string } // linked, invite token not set yet
  | { kind: "paused"; githubId: string; login: string } // the invite token stopped working
  | { kind: "member" | "invited" | "none" | "unknown"; githubId: string; login: string };

export type Person = { name?: string | null; picture?: string | null };

export const ERRORS: Record<string, string> = {
  github_denied: "You cancelled on GitHub, so nothing was connected.",
  github_failed: "Connecting GitHub didn't work. Try again.",
  github_taken: "That GitHub account is already linked to another Sandbox member.",
  expired: "That took a while, so connect GitHub again to continue.",
  invite_failed: "We couldn't send the invite. Try again in a minute, or ask an admin.",
  invites_paused: "Invites are paused right now, so no invite was sent.",
};

const primary =
  "inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover";
const secondary =
  "inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:bg-wash";

export function JoinScreen({ member, view, error }: { member: Person; view: View; error?: string }) {
  const github = "login" in view ? view : null;
  const linked = view.kind !== "setup" && view.kind !== "connect" && view.kind !== "confirm";
  const { title, body, action, note } = copy(view);

  return (
    <main className="flex flex-1 justify-center px-6 pb-16 pt-8 sm:pt-16">
      <div className="w-full max-w-md">
        <Pairing member={member} github={github} linked={linked} />

        {error && ERRORS[error] && (
          <p role="alert" className="mt-8 border-l-2 border-danger pl-3 text-sm text-danger">
            {ERRORS[error]}
          </p>
        )}

        <h1 className="mt-8 font-serif text-4xl font-medium leading-tight tracking-tight">
          {title}
        </h1>
        <div className="mt-3 text-muted">{body}</div>
        {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
        {note && <p className="mt-4 text-sm text-muted">{note}</p>}

        {view.kind !== "setup" && <Journey step={step(view)} />}
        {view.kind === "member" && <BringYourApp />}
      </div>
    </main>
  );
}

// The member's Sandbox photo and their GitHub avatar, joined by the Sandbox
// mark. The line is dashed until the GitHub account is linked.
function Pairing({
  member,
  github,
  linked,
}: {
  member: Person;
  github: { githubId: string; login: string } | null;
  linked: boolean;
}) {
  return (
    <div className="flex items-center rounded-full bg-wash p-2">
      <Avatar name={member.name} picture={member.picture} size={56} />
      <div className="relative mx-2 flex flex-1 items-center justify-center">
        <div
          className={`absolute inset-x-0 top-1/2 ${linked ? "border-t-2 border-brand" : "border-t-2 border-dashed border-line"}`}
        />
        <span className={`relative rounded-full bg-wash px-2 ${linked ? "text-brand" : "text-muted"}`}>
          <Mark size={22} />
        </span>
      </div>
      {github ? (
        <Avatar name={github.login} picture={avatarUrl(github.githubId)} size={56} />
      ) : (
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line text-muted"
          role="img"
          aria-label="Your GitHub account, not connected yet"
        >
          <GitHubIcon />
        </div>
      )}
    </div>
  );
}

const STEPS = ["Sign in with Sandbox", "Connect your GitHub account", "Accept the invite on GitHub"];

// Where the member is: 1 = connecting, 2 = accepting the invite, 3 = done.
function step(view: View) {
  if (view.kind === "connect" || view.kind === "confirm") return 1;
  if (view.kind === "member") return 3;
  return 2;
}

function Journey({ step }: { step: number }) {
  return (
    <ol className="mt-12 space-y-3 border-t border-line pt-6 text-sm">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-3 ${done || current ? "" : "text-muted"}`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                done ? "bg-brand text-on-brand" : current ? "border-2 border-brand" : "border border-line"
              }`}
              aria-hidden="true"
            >
              {done ? "✓" : ""}
            </span>
            <span className={current ? "font-medium" : ""}>{label}</span>
            {done && <span className="sr-only">(done)</span>}
          </li>
        );
      })}
    </ol>
  );
}

// For members with an app in their own GitHub account that the community could
// share. Moving it is done on GitHub; this only explains how and what changes.
function BringYourApp() {
  return (
    <section className="mt-12 border-t border-line pt-6 text-sm">
      <h2 className="font-medium">Bring your app to {ORG}</h2>
      <p className="mt-2 text-muted">
        Have a repo other members could use or help with? Move it here so everyone can find it and suggest changes.
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5">
        <li>On GitHub, open your repo&apos;s Settings.</li>
        <li>At the bottom, choose Transfer ownership, pick {ORG}, and confirm.</li>
      </ol>
      <details className="mt-4">
        <summary className="cursor-pointer text-muted hover:text-foreground">What changes when you move it</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
          <li>Your old link still works: it sends people to the new place, and so does git.</li>
          <li>Issues, pull requests and stars come with it.</li>
          <li>
            You can still push and merge changes. Other members can suggest changes with pull requests, and you decide
            what goes in.
          </li>
          <li>
            You can&apos;t change the repo&apos;s settings any more, and {ORG} owners have full control of it. Ask an
            owner for setting changes, or to move it back.
          </li>
          <li>Keep it public, so other members can see it.</li>
          <li>
            Reconnect tools linked to your account, like Vercel: they need access to {ORG} now, which an owner may have
            to approve.
          </li>
          <li>A GitHub Pages site moves to {ORG}.github.io, and the old address stops working.</li>
          <li>Don&apos;t make a new repo with the old name in your account: the old link would stop sending people here.</li>
        </ul>
      </details>
    </section>
  );
}

function copy(view: View): { title: string; body: ReactNode; action?: ReactNode; note?: ReactNode } {
  const org = (
    <a href={`https://github.com/${ORG}`} className="underline underline-offset-2 hover:text-foreground">
      {ORG}
    </a>
  );
  const handle = "login" in view ? `@${view.login}` : "";

  switch (view.kind) {
    case "setup":
      return {
        title: "Almost ready",
        body: <p>This app is still being set up, so GitHub can&apos;t be connected yet. Check back soon.</p>,
        note: view.missing.length > 0 && <>Missing settings: {view.missing.join(", ")}</>,
      };
    case "connect":
      return {
        title: "Join Sandbox on GitHub",
        body: <p>Link your GitHub account and you&apos;ll get an invite to the {org} organization. No waiting for an admin.</p>,
        action: (
          <form action="/api/github/connect" method="post">
            <button className={primary}>Connect GitHub</button>
          </form>
        ),
        note: "GitHub only shares your public profile with us.",
      };
    case "confirm":
      return {
        title: "Is this you on GitHub?",
        body: (
          <p>
            <strong className="font-medium text-foreground">{handle}</strong> will be linked to your Sandbox
            membership. Each member links one GitHub account.
          </p>
        ),
        action: (
          <>
            <form action={confirmGitHub}>
              <button className={primary}>Yes, invite {handle}</button>
            </form>
            <form action={cancelGitHub}>
              <button className={secondary}>Not me</button>
            </form>
          </>
        ),
        note: "Wrong account? Choose “Not me”, switch accounts on github.com, then connect again. To change it after confirming, ask a Sandbox admin to unlink it.",
      };
    case "invited":
      return {
        title: "Your invite is waiting",
        body: <p>Accept it on GitHub to join {org} as {handle}.</p>,
        action: (
          <a href={INVITATION_URL} className={primary}>
            Accept the invite
          </a>
        ),
        note: "Accepted it? It can take a minute to show here. Invites expire after 7 days; if yours does, come back here for a new one.",
      };
    case "member":
      return {
        title: "You’re in",
        body: <p>{handle} is a member of {org}. Welcome.</p>,
        action: (
          <a href={`https://github.com/${ORG}`} className={secondary}>
            Open {ORG} on GitHub
          </a>
        ),
      };
    case "none":
      return {
        title: "No invite waiting",
        body: <p>There&apos;s no open invite for {handle}: it may have expired (they last 7 days). Send a new one to join {org}.</p>,
        action: (
          <form action={inviteAgain}>
            <button className={primary}>Send a new invite</button>
          </form>
        ),
        note: "If you left the org on purpose, you can ignore this.",
      };
    case "no-invites":
      return {
        title: "Your GitHub account is linked",
        body: <p>{handle} is linked to your Sandbox membership. Invites aren&apos;t switched on yet: come back soon, or ask an admin if it stays like this.</p>,
      };
    case "paused":
      return {
        title: "Invites are paused",
        body: (
          <p>
            {handle} is linked, but the app can&apos;t reach the {org} org right now. An admin needs to renew its
            GitHub access. Refreshing won&apos;t help, so let a Sandbox admin know.
          </p>
        ),
      };
    case "unknown":
      return {
        title: "GitHub isn’t answering",
        body: <p>We couldn&apos;t check your invite for {handle} just now. Refresh the page in a minute.</p>,
      };
  }
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
