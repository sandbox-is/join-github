"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { getMember } from "@/lib/session";

// Forget a member's GitHub pairing so they can connect a different account.
// It doesn't remove anyone from the GitHub org: do that on GitHub if needed.
export async function unlinkGitHub(formData: FormData) {
  if (!isAdmin(await getMember())) redirect("/");
  const memberSub = formData.get("member_sub");
  if (typeof memberSub !== "string" || !memberSub) throw new Error("Unlink needs a member_sub.");

  await sql`delete from github_links where member_sub = ${memberSub}`;
  await sql`delete from github_pending where member_sub = ${memberSub}`;
  revalidatePath("/admin");
}
