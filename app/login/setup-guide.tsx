import Link from "next/link";
import { headers } from "next/headers";
import { SETTINGS, testSignIn } from "@/lib/setup";
import { CopyButton } from "./copy-button";

const VIBES = "https://members.sandbox.is/vibes";

// Shown on the login page until both settings are set, so someone who just
// clicked "Deploy" can finish setting up without reading anything else.
export async function SetupGuide({ missing }: { missing: string[] }) {
  const host = (await headers()).get("host") ?? "";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  // On Vercel, link the project's main address, not this deployment's own one.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const address = `https://${production ?? host}`;
  const port = host.split(":")[1] ?? "3000";

  const steps = (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold">Almost there</h1>
        <p className="mt-1 text-neutral-500">
          {local
            ? "Link your app to Sandbox so members can sign in."
            : "Your app is online. Link it to Sandbox so members can sign in."}
        </p>
      </div>

      {testSignIn() && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          While you build, you&apos;re signed in as a test member.{" "}
          <Link className="underline" href="/">
            Back to your app
          </Link>
          . Link it when it&apos;s ready to show.
        </div>
      )}

      <ol className="space-y-5">
        <li>
          <p className="font-medium">1. Link your app</p>
          {local ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              When it&apos;s ready to show, ask your AI agent to{" "}
              <em>&ldquo;put it online&rdquo;</em>. It gives you the address to paste into{" "}
              <em>Where it lives</em> on the Vibes page. Put <code>{port}</code> as the local port.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Copy your app&apos;s address. On the Vibes page, paste it into{" "}
                <em>Where it lives</em>, give your app a name, and click <em>Ask to link</em>.
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-md bg-neutral-100 p-2 dark:bg-neutral-900">
                <code className="flex-1 truncate text-sm">{address}</code>
                <CopyButton text={address} />
              </div>
            </>
          )}
          <a
            href={VIBES}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            Open the Vibes page
          </a>
        </li>

        <li>
          <p className="font-medium">2. Wait for an admin to approve it</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            The Vibes page then shows your app&apos;s ID.
          </p>
        </li>

        <li>
          <p className="font-medium">3. Add two settings</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Easiest: ask your AI agent to <em>&ldquo;finish Sandbox setup&rdquo;</em> and give it
            your app&apos;s ID. It adds both settings and redeploys for you.
          </p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Or do it yourself.{" "}
            {local ? (
              <>Put them in <code>.env.local</code>, then restart <code>npm run dev</code>.</>
            ) : (
              <>
                In Vercel, open your project, go to <em>Settings → Environment Variables</em>{" "}
                and add them. Then go to <em>Deployments</em> and click <em>Redeploy</em>.
              </>
            )}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {SETTINGS.map((name) => (
              <li key={name}>
                {missing.includes(name) ? "○" : "✓"} <code>{name}</code>
                <span className="text-neutral-500">
                  {name === "SANDBOX_AUTH_CLIENT_ID"
                    ? " — your app's ID"
                    : " — click “Make one for me” on the Vibes page"}
                </span>
              </li>
            ))}
          </ul>
        </li>
      </ol>

      <p className="text-xs text-neutral-500">
        Your app&apos;s ID isn&apos;t secret, so it&apos;s fine to give it to your agent. Never
        paste the session secret into a chat.
      </p>
    </div>
  );

  if (local) return steps;

  // Online, anyone with the link may land here before the app is approved, so
  // they see "coming soon"; the steps are one click away for whoever built it.
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Coming soon</h1>
        <p className="mt-1 text-neutral-500">
          This Sandbox app is still being set up. Check back soon.
        </p>
      </div>
      <details className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm text-neutral-500">
          Setting this app up? Show the steps
        </summary>
        <div className="mt-4">{steps}</div>
      </details>
    </div>
  );
}
