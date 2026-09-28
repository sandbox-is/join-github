import type { ReactNode } from "react";
import Script from "next/script";
import { GitHubIcon } from "@/components/github-icon";
import { Mark } from "@/components/logo";
import { ORG } from "@/lib/github";
import { missingSettings } from "@/lib/setup";
import { SetupGuide } from "./setup-guide";

// Only same-site paths. sandbox-auth v0.7.1 rejects "//host" but not "/\host",
// which browsers also read as another site.
function safeNext(next: string | undefined) {
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const missing = missingSettings();

  if (missing.length > 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <SetupGuide missing={missing} />
        </div>
      </main>
    );
  }

  const org = (
    <a href={`https://github.com/${ORG}`} className="underline underline-offset-2 hover:text-foreground">
      {ORG}
    </a>
  );

  // The landing page for anyone signed out: say what this is before asking
  // them to sign in.
  return (
    <main className="flex flex-1 justify-center px-6 pb-16 pt-8 sm:pt-16">
      <div className="w-full max-w-md">
        <Hero />

        <h1 className="mt-8 font-serif text-4xl font-medium leading-tight tracking-tight">
          Join Sandbox on GitHub
        </h1>
        <div className="mt-3 space-y-3 text-muted">
          <p>
            {org} is Sandbox&apos;s organization on GitHub, where members keep the apps and code they
            build together.
          </p>
          <p>
            Anyone can already look at the code there, since it&apos;s public. Joining lets you add your own:
            start new projects in {org}, or move in ones you&apos;ve already made, so other members can find
            and contribute to them.
          </p>
          <p>As a Sandbox member, you can join it yourself, right here. It takes about a minute.</p>
        </div>

        {error === "access_denied" && (
          <p role="alert" className="mt-6 border-l-2 border-danger pl-3 text-sm text-danger">
            You chose not to share your details, so you&apos;re not signed in.
          </p>
        )}
        {error && error !== "access_denied" && (
          <p role="alert" className="mt-6 border-l-2 border-danger pl-3 text-sm text-danger">
            Signing in didn&apos;t work. Try again.
          </p>
        )}

        <div className="mt-6">
          {/* The client id isn't secret: it ends up in the page either way. */}
          <div
            data-sandbox-signin
            data-client={process.env.SANDBOX_AUTH_CLIENT_ID}
            data-next={safeNext(next)}
          />
          <Script src="https://auth.sandbox.is/button.js" strategy="afterInteractive" />
        </div>

        <section className="mt-12 border-t border-line pt-6 text-sm">
          <h2 className="font-medium">How it works</h2>
          <ol className="mt-4 space-y-4 text-muted">
            <Step n={1} icon={<Mark size={18} />}>
              <span className="text-foreground">Sign in with Sandbox</span>, so we know you&apos;re a member.
            </Step>
            <Step n={2} icon={<GitHubIcon size={18} />}>
              <span className="text-foreground">Connect your GitHub account.</span> We only see your public
              profile.
            </Step>
            <Step n={3} icon={<InviteIcon />}>
              <span className="text-foreground">Accept the invite on GitHub</span>, and you&apos;re in {org}.
            </Step>
          </ol>
          <p className="mt-4 text-muted">
            No GitHub account yet?{" "}
            <a href="https://github.com/signup" className="underline underline-offset-2 hover:text-foreground">
              Make one first
            </a>
            , it&apos;s free.
          </p>
        </section>
      </div>
    </main>
  );
}

// Sandbox and GitHub, joined by a dashed line: what this app connects. The
// same shape as the home page's strip, before anything is linked.
function Hero() {
  return (
    <figure>
      <div className="flex items-center rounded-full bg-wash p-2">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
          <Mark size={30} />
        </div>
        <div className="relative mx-2 flex flex-1 items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-brand/40" />
          <span className="relative rounded-full bg-wash px-2 text-brand">
            <LinkIcon />
          </span>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <GitHubIcon size={28} />
        </div>
      </div>
      <figcaption className="mt-2 flex justify-between px-2 text-xs text-muted">
        <span>Your Sandbox membership</span>
        <span>Your GitHub account</span>
      </figcaption>
    </figure>
  );
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wash text-brand"
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="pt-1.5">
        <span className="sr-only">Step {n}: </span>
        {children}
      </p>
    </li>
  );
}

// A chain link: the two accounts, linked.
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// An envelope: the invite GitHub sends.
function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
