import Script from "next/script";
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

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>

        {error === "access_denied" && (
          <p className="text-sm text-red-600">
            You chose not to share your details, so you&apos;re not signed in.
          </p>
        )}
        {error && error !== "access_denied" && (
          <p className="text-sm text-red-600">Signing in didn&apos;t work. Try again.</p>
        )}

        {/* The client id isn't secret: it ends up in the page either way. */}
        <div
          data-sandbox-signin
          data-client={process.env.SANDBOX_AUTH_CLIENT_ID}
          data-next={safeNext(next)}
        />
        <Script src="https://auth.sandbox.is/button.js" strategy="afterInteractive" />
      </div>
    </main>
  );
}
