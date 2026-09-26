import type { Member } from "./session";
import { testSignIn } from "./setup";

// Admins are listed by email in SANDBOX_ADMINS, separated by commas.
export function isAdmin(member: Member | null) {
  if (!member?.email) return false;
  const admins = (process.env.SANDBOX_ADMINS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  // With test sign-in and nobody listed, the test member is an admin, so admin
  // pages can be built. List someone else in .env.local to try it without.
  if (admins.length === 0 && testSignIn()) return true;
  return admins.includes(member.email.toLowerCase());
}
