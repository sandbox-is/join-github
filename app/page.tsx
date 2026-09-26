import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import { hasDatabase, sql } from "@/lib/db";
import { getMember } from "@/lib/session";

type SavedMember = { sub: string; name: string | null; picture: string | null };

export default async function Home() {
  // proxy.ts already sends signed-out people to /login; this is a backstop.
  const member = await getMember();
  if (!member) redirect("/login");

  const recent = hasDatabase()
    ? await sql<SavedMember>`select sub, name, picture from members order by last_seen_at desc limit 12`
    : [];

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Avatar name={member.name} picture={member.picture} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Hi, {member.name ?? "member"}</h1>
          {member.email && <p className="text-sm text-neutral-500">{member.email}</p>}
          {isAdmin(member) && (
            <p className="mt-2 inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800">
              You&apos;re an admin
            </p>
          )}
        </div>

        {recent.length > 0 && (
          <div>
            <p className="text-sm text-neutral-500">Signed in here recently</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {recent.map((m) => (
                <Avatar key={m.sub} name={m.name} picture={m.picture} size={36} />
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-neutral-500">
          You&apos;re signed in with Sandbox. Now ask your agent to build your idea.
        </p>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
