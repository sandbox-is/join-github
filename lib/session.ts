import { getSession } from "sandbox-auth/next";
import { hasDatabase, sql } from "./db";
import { testSignIn } from "./setup";

export type Member = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const TEST_MEMBER: Member = {
  sub: "00000000-0000-0000-0000-000000000000",
  name: "Test Member",
  email: "test.member@example.com",
};

// Members already saved by this server, by sign-in time, so it's once per sign-in.
const saved = new Map<string, number | undefined>();

// The signed-in member, or null. Use this rather than sandbox-auth's
// getSession so pages also work with test sign-in.
//
// It also saves their name and photo in the members table, so the app can
// show them to other members.
export async function getMember(): Promise<Member | null> {
  const member = testSignIn() ? TEST_MEMBER : await getSession();
  if (member && hasDatabase() && (!saved.has(member.sub) || saved.get(member.sub) !== member.iat)) {
    await sql`
      insert into members (sub, name, email, picture)
      values (${member.sub}, ${member.name ?? null}, ${member.email ?? null}, ${member.picture ?? null})
      on conflict (sub) do update set
        name = excluded.name, email = excluded.email, picture = excluded.picture, last_seen_at = now()`;
    saved.set(member.sub, member.iat);
  }
  return member;
}
