import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { isAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { avatarUrl } from "@/lib/github";
import { getMember } from "@/lib/session";
import { unlinkGitHub } from "./actions";

type Joined = {
  member_sub: string;
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
    select l.member_sub, m.name, m.email, l.github_id::text as github_id, l.github_login, l.linked_at, l.invited_at
    from github_links l join members m on m.sub = l.member_sub
    order by l.linked_at desc`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 pb-16 pt-8 sm:pt-16">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Who&apos;s joined</h1>
      <p className="text-muted">
        {joined.length === 0
          ? "Nobody has joined through the app yet."
          : `${joined.length} ${joined.length === 1 ? "member has" : "members have"} linked a GitHub account.`}
      </p>

      {joined.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4 font-normal">Sandbox member</th>
                <th scope="col" className="py-2 pr-4 font-normal">GitHub</th>
                <th scope="col" className="py-2 pr-4 font-normal">Linked</th>
                <th scope="col" className="py-2 pr-4 font-normal">Invited</th>
                <th scope="col" className="py-2 font-normal">
                  <span className="sr-only">Unlink</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {joined.map((j) => (
                <tr key={j.github_id} className="border-b border-line align-top">
                  <td className="py-2 pr-4">
                    <div>{j.name ?? "—"}</div>
                    <div className="text-xs text-muted">{j.email}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <a href={`https://github.com/${j.github_login}`} className="flex items-center gap-2 underline-offset-2 hover:underline">
                      <Avatar name={j.github_login} picture={avatarUrl(j.github_id)} size={24} />@{j.github_login}
                    </a>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4">{when(j.linked_at)}</td>
                  <td className="whitespace-nowrap py-2 pr-4">
                    {j.invited_at ? when(j.invited_at) : <span className="text-muted">Didn&apos;t need one</span>}
                  </td>
                  <td className="w-44 py-2">
                    {/* Two steps, no pop-up: open, then confirm. */}
                    <details>
                      <summary className="cursor-pointer list-none text-muted hover:text-foreground">Unlink</summary>
                      <form action={unlinkGitHub} className="mt-2 space-y-2 text-xs">
                        <input type="hidden" name="member_sub" value={j.member_sub} />
                        <p className="text-muted">
                          They can then connect another account. It doesn&apos;t remove anyone from the org.
                        </p>
                        <button className="rounded-full border border-danger px-3 py-1 font-medium text-danger">
                          Unlink @{j.github_login}
                        </button>
                      </form>
                    </details>
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
