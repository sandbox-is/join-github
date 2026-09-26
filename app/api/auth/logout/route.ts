import { NextResponse, type NextRequest } from "next/server";
import { signOut } from "sandbox-auth/next";
import { testSignIn } from "@/lib/setup";

// Signs out of this app only (the person stays signed in to Sandbox itself).
// 303 so the browser follows the form POST with a GET to /login.
export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  // With test sign-in there's no real session to clear.
  if (!testSignIn()) signOut(res);
  return res;
}
