// Finishes Sign in with Sandbox setup once the app is approved:
//
//   npm run setup -- <app ID from the Vibes page>
//
// It saves the app ID in Vercel, makes a session secret and saves it without
// ever printing it, fills in .env.local for local use, and redeploys.
// Needs the Vercel CLI to be signed in (npx vercel login).
//
//   npm run setup -- <app ID> --local-only
//
// Only fills in .env.local, for real sign-in on your own computer. For
// collaborators: it never touches Vercel or the live app's secret.
//
//   --admins a@x.com,b@y.com
//
// Also sets who the app's admins are (SANDBOX_ADMINS, by Sandbox email),
// replacing the list. --admins none removes them all.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  fail,
  linkedProjectId,
  parseJson,
  productionAddress,
  requireVercelLogin,
  run,
  vercel,
  vercelProject,
} from "./lib.mjs";

const ID = "SANDBOX_AUTH_CLIENT_ID";
const ADMINS = "SANDBOX_ADMINS";
const SECRET = "SANDBOX_AUTH_CLIENT_SESSION_SECRET";

const newSecret = () => randomBytes(32).toString("base64url");

// Sets NAME=value in .env.local, keeping every other line as it was. Local
// development gets its own secret: sessions on localhost and on the live
// site are separate anyway.
function fillEnvLocal(clientId, admins) {
  const lines = existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [];
  const set = (name, value) => {
    const i = lines.findIndex((l) => l.startsWith(`${name}=`));
    if (i >= 0) lines[i] = `${name}=${value}`;
    else lines.push(`${name}=${value}`);
  };
  set(ID, clientId);
  if (admins === "none") {
    const i = lines.findIndex((l) => l.startsWith(`${ADMINS}=`));
    if (i >= 0) lines.splice(i, 1);
  } else if (admins) {
    set(ADMINS, admins);
  }
  if (!lines.some((l) => l.startsWith(`${SECRET}=`) && l.length > SECRET.length + 1)) {
    set(SECRET, newSecret());
  }
  writeFileSync(".env.local", lines.join("\n").trimEnd() + "\n");
  console.log("Filled in .env.local for running on your computer.");
}

const args = process.argv.slice(2);
const localOnly = args.includes("--local-only");
const adminsFlag = args.indexOf("--admins");
const admins = adminsFlag >= 0 ? args[adminsFlag + 1]?.replace(/\s/g, "") : undefined;
const [clientId] = args.filter((a, i) => !a.startsWith("--") && !(adminsFlag >= 0 && i === adminsFlag + 1));

if (adminsFlag >= 0 && admins !== "none" && !admins?.includes("@")) {
  fail("List admins by their Sandbox email, separated by commas (or none):  --admins a@x.com,b@y.com");
}

if (!clientId || /\s/.test(clientId)) {
  fail("Give your app ID from https://members.sandbox.is/vibes:  npm run setup -- <app ID>");
}

if (localOnly) {
  fillEnvLocal(clientId, admins);
  console.log("\n✓ Done. Restart  npm run dev  and sign in with Sandbox.");
  console.log("  This works if the app was linked with a local port that matches (usually 3000).\n");
  process.exit(0);
}

console.log("Checking you're signed in to Vercel…");
requireVercelLogin();

// The folder's link to Vercel names the exact project, so nothing else with a
// similar name can be changed by mistake.
if (!linkedProjectId()) {
  const origin = run("git", ["config", "--get", "remote.origin.url"]).out.trim();
  const [, owner, repo] = origin.match(/github\.com[/:]([^/]+)\/([^/]+?)(\.git)?\/?$/) ?? [];
  if (!repo) fail("This folder isn't on GitHub yet. Run  npm run online  first.");
  // Only a project connected to this very repo will do: a project that merely
  // shares the name could be someone else's app.
  const candidate = vercelProject(repo);
  if (!candidate) fail(`There's no Vercel project called "${repo}". Run  npm run online  first.`);
  if (`${candidate.link?.org}/${candidate.link?.repo}` !== `${owner}/${repo}`) {
    fail(
      `The Vercel project "${repo}" isn't connected to github.com/${owner}/${repo}, so it may be a different app.\n` +
        "Run  npm run online  first: it links this folder to the right project.",
    );
  }
  console.log(`Linking this folder to the Vercel project "${repo}"…`);
  const linked = vercel(["link", "--yes", "--project", candidate.id]);
  if (!linked.ok) fail(`Couldn't link this folder to the Vercel project.\n${linked.err.trim()}`);
}
const project = vercelProject(linkedProjectId());
if (!project) fail("This folder is linked to a Vercel project that no longer exists. Run  npm run online  first.");
console.log(`Setting up the Vercel project "${project.name}" (${productionAddress(project) ?? "not online yet"})…`);

const envList = vercel(["env", "ls", "production", "--json"]);
if (!envList.ok) fail(`Couldn't read the project's settings.\n${envList.err.trim()}`);
const existing = new Set(parseJson(envList.out, "the settings").envs.map((e) => e.key));

console.log(`Saving ${ID}…`);
const idSaved = vercel(["env", "add", ID, "production", "--no-sensitive", "--force", "--yes"], clientId);
if (!idSaved.ok) fail(`Couldn't save ${ID} in Vercel.\n${idSaved.err.trim()}`);

if (existing.has(SECRET)) {
  // Changing it would sign everyone out, so an existing one stays.
  console.log(`${SECRET} is already set. Keeping it.`);
} else {
  console.log(`Making ${SECRET} and saving it (it's never shown)…`);
  const secretSaved = vercel(["env", "add", SECRET, "production", "--sensitive", "--yes"], newSecret());
  if (!secretSaved.ok) fail(`Couldn't save ${SECRET} in Vercel.\n${secretSaved.err.trim()}`);
}

if (admins === "none") {
  if (existing.has(ADMINS)) {
    console.log(`Removing ${ADMINS}, so nobody is an admin…`);
    const removed = vercel(["env", "rm", ADMINS, "production", "--yes"]);
    if (!removed.ok) fail(`Couldn't remove ${ADMINS} in Vercel.\n${removed.err.trim()}`);
  }
} else if (admins) {
  console.log(`Saving ${ADMINS}…`);
  const adminsSaved = vercel(["env", "add", ADMINS, "production", "--no-sensitive", "--force", "--yes"], admins);
  if (!adminsSaved.ok) fail(`Couldn't save ${ADMINS} in Vercel.\n${adminsSaved.err.trim()}`);
}

fillEnvLocal(clientId, admins);

if (!existing.has("DATABASE_URL")) {
  console.log("Note: the live app has no database yet. Run  npm run online  to add one.");
}

console.log("Redeploying so the new settings take effect (about a minute)…");
const list = vercel(["ls", "--environment", "production", "--status", "READY", "--json", "--limit", "1"]);
const latest = list.ok ? parseJson(list.out, "the deployments").deployments[0] : undefined;
if (!latest) fail("Couldn't find a live version of your app to redeploy. Run  npm run online  first.");
const redeploy = vercel(["redeploy", latest.url, "--target", "production"]);
if (!redeploy.ok) {
  fail(`The settings are saved, but the redeploy didn't work. In Vercel, open Deployments and click Redeploy.\n${redeploy.err.trim()}`);
}

console.log(`\n✓ Done. Open ${productionAddress(project) ?? "your app"} and sign in with Sandbox.\n`);
