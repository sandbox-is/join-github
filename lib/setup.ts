// The two settings sign-in needs. Until both are set the app still runs,
// and the login page walks the person through setting it up.
export const SETTINGS = ["SANDBOX_AUTH_CLIENT_ID", "SANDBOX_AUTH_CLIENT_SESSION_SECRET"] as const;

export function missingSettings() {
  return SETTINGS.filter((name) => !process.env[name]);
}

// While building on your own computer, before the app is set up, everyone is
// signed in as a test member so every page can be built and tried.
// Never on Vercel: `next build` and `next start` always run as "production",
// and VERCEL_ENV is checked too in case a Vercel deploy is ever run another way.
export function testSignIn() {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL_ENV &&
    missingSettings().length > 0
  );
}
