import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { appOrigin, authorizeUrl, CALLBACK_PATH, canConnect, STATE_COOKIE } from "@/lib/github";
import { getMember } from "@/lib/session";

// The "Connect GitHub" button posts here; we send them on to GitHub to sign in.
// A random "state" in a cookie makes sure the answer that comes back to the
// callback is for this sign-in, started by this browser.
export async function POST(request: NextRequest) {
  const origin = appOrigin(request.url);
  const member = await getMember();
  if (!member) return NextResponse.redirect(new URL("/login", origin), 303);
  if (!canConnect()) return NextResponse.redirect(new URL("/", origin), 303);

  // One GitHub account per member: once linked, there's nothing to connect.
  const [linked] = await sql`select 1 from github_links where member_sub = ${member.sub}`;
  if (linked) return NextResponse.redirect(new URL("/", origin), 303);

  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(state, new URL(CALLBACK_PATH, origin).toString()), 303);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent when GitHub sends them back
    path: CALLBACK_PATH,
    maxAge: 10 * 60,
  });
  return res;
}
