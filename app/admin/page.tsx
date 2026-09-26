import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { avatarUrl } from "@/lib/github";
import { getMember } from "@/lib/session";

type Joined = {
  name: string | null;
  email: string | null;
  github_id: string;
  github_login: string;
  linked_at: Date;
  invited_at: Date | null;
};

function when(date: Date | string) {
  return new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

// Everyone who has linked a GitHub account through this app. Admins only.
export default async function Admin() {
  const member = await getMember();
  if (!isAdmin(member)) redirect("/");

  const joined = await sql<Joined>`
    select m.name, m.email, l.github_id::text as github_id, l.github_login, l.linked_at, l.invited_at
    from github_links l join members m on m.sub = l.member_sub
    order by l.linked_at desc`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Who&apos;s joined</h1>
        <Link href="/" className="text-sm text-neutral-500 underline">
          Back
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        {joined.length === 0
          ? "Nobody has joined through the app yet."
          : `${joined.length} ${joined.length === 1 ? "member has" : "members have"} linked a GitHub account.`}
      </p>

      {joined.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-normal">Sandbox member</th>
                <th className="py-2 pr-4 font-normal">GitHub</th>
                <th className="py-2 pr-4 font-normal">Linked</th>
                <th className="py-2 font-normal">Invited</th>
              </tr>
            </thead>
            <tbody>
              {joined.map((j) => (
                <tr key={j.github_id} className="border-b border-neutral-100 align-top dark:border-neutral-900">
                  <td className="py-2 pr-4">
                    <div>{j.name ?? "—"}</div>
                    <div className="text-xs text-neutral-500">{j.email}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <a href={`https://github.com/${j.github_login}`} className="flex items-center gap-2 underline">
                      <Avatar name={j.github_login} picture={avatarUrl(j.github_id)} size={24} />@{j.github_login}
                    </a>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4">{when(j.linked_at)}</td>
                  <td className="whitespace-nowrap py-2">
                    {j.invited_at ? when(j.invited_at) : <span className="text-neutral-500">Didn&apos;t need one</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
