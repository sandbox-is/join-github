import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { appOrigin, CALLBACK_PATH, exchangeCode, fetchUser, revokeToken, STATE_COOKIE, type GitHubUser } from "@/lib/github";
import { getMember } from "@/lib/session";

// GitHub sends people back here after they sign in. This is GitHub's callback,
// kept apart from Sandbox's (/api/auth/callback). It must match the
// "Authorization callback URL" of the GitHub OAuth app.
//
// We read their GitHub id and username, cancel GitHub's token straight away,
// and save the account as "waiting for them to confirm".
export async function GET(request: NextRequest) {
  const origin = appOrigin(request.url);
  const member = await getMember();
  if (!member) return NextResponse.redirect(new URL("/login", origin));

  const home = (error?: string) => {
    const url = new URL("/", origin);
    if (error) url.searchParams.set("error", error);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: STATE_COOKIE, path: CALLBACK_PATH });
    return res;
  };

  // Only answers to a sign-in this browser started count, cancellations included.
  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  if (!state || state !== request.cookies.get(STATE_COOKIE)?.value) {
    // Not ours: leave any sign-in that is in progress alone.
    return NextResponse.redirect(new URL("/?error=github_failed", origin));
  }
  if (params.get("error") === "access_denied") return home("github_denied");
  const code = params.get("code");
  if (!code) return home("github_failed");

  let user: GitHubUser;
  try {
    const token = await exchangeCode(code, new URL(CALLBACK_PATH, origin).toString());
    try {
      user = await fetchUser(token);
    } finally {
      await revokeToken(token);
    }
  } catch (error) {
    console.error("GitHub sign-in failed:", error);
    return home("github_failed");
  }

  // One member per GitHub account.
  const [owner] = await sql<{ member_sub: string }>`
    select member_sub from github_links where github_id = ${user.id}`;
  if (owner && owner.member_sub !== member.sub) return home("github_taken");

  await sql`
    insert into github_pending (member_sub, github_id, github_login)
    values (${member.sub}, ${user.id}, ${user.login})
    on conflict (member_sub) do update set
      github_id = excluded.github_id, github_login = excluded.github_login, verified_at = now()`;
  return home();
}
