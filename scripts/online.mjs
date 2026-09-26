// Puts the app online: a public GitHub repo, a Vercel project connected to it,
// and a first deploy. Every later change pushed to GitHub goes online by itself.
//
//   npm run online                         show what would happen
//   npm run online -- --yes                do it
//   options: --owner <GitHub account or org>  (default: sandbox-is)
//            --name <app name>                (default: this folder's name)
//
// Each step checks whether it's already done, so running it again is safe:
// it picks up where it left off, and after that it just uploads new changes.
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { basename } from "node:path";
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

const ORG = "sandbox-is";
const JOIN_ORG =
  `Most Sandbox apps live in the ${ORG} GitHub org, where other members can find\n` +
  "them and help. To join, ask a Sandbox admin to add your GitHub username.";

// Paths where integrations put coding-assistant files.
function helpFiles() {
  const found = new Set();
  for (const path of [".agents", "skills-lock.json"]) if (existsSync(path)) found.add(path);
  if (existsSync(".claude/skills")) {
    for (const entry of readdirSync(".claude/skills")) found.add(`.claude/skills/${entry}`);
  }
  return found;
}

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const go = args.includes("--yes");

// "owner/name" from an https or ssh GitHub address, or null.
const githubRepo = (url) => url.match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?\/?$/)?.[1] ?? null;

const origin = run("git", ["config", "--get", "remote.origin.url"]);
const existingRepo = origin.ok ? githubRepo(origin.out.trim()) : null;
const onGitHub = Boolean(existingRepo);
// Once the code is on GitHub, the repo decides the owner and name.
const name = existingRepo?.split("/")[1] ?? option("--name") ?? basename(process.cwd());

if (!/^[a-z0-9][a-z0-9-]{0,98}$/.test(name)) {
  fail(`"${name}" can't be used as an app name. Use lowercase letters, numbers and dashes, like --name hub-dinners`);
}

// --- Checks: signed in to both, and allowed to use the owner ---------------

const gh = run("gh", ["api", "user", "--jq", ".login"]);
if (gh.notInstalled) {
  fail("GitHub's command-line tool isn't installed. Get it from https://cli.github.com (on a Mac: brew install gh).");
}
if (!gh.ok) fail("You're not signed in to GitHub. Run  gh auth login  and try again.");
const githubUser = gh.out.trim();
const vercelUser = requireVercelLogin();

// "active", "pending" (invited, not yet accepted) or "" (not a member).
const orgState = (org) => run("gh", ["api", `user/memberships/orgs/${org}`, "--jq", ".state"]).out.trim();
const inOrg = (org) => orgState(org) === "active";

// The sandbox-is org by default, or their own account until they're in it.
let owner = existingRepo?.split("/")[0] ?? option("--owner");
let ownerNote = "";
if (!owner) {
  const state = orgState(ORG);
  owner = state === "active" ? ORG : githubUser;
  if (state === "pending") {
    ownerNote =
      `You've been invited to the ${ORG} GitHub org but haven't accepted yet.\n` +
      `Accept at https://github.com/orgs/${ORG}/invitation and run this again to put\n` +
      `the app there. Or go ahead, and it goes under your own account (${githubUser}).`;
  } else if (state !== "active") {
    ownerNote =
      `${JOIN_ORG}\nYou're not in it yet, so this would go under your own account\n` +
      `(${githubUser}). You can wait until you've joined, or go ahead and move it later.`;
  }
}


// --- What's already done -----------------------------------------------------

const repo = existingRepo ?? `${owner}/${name}`;
const repoUrl = `https://github.com/${repo}`;
// Only a new repo needs permission to create it under the owner; once the code
// is on GitHub, that's where it stays.
if (!onGitHub && owner !== githubUser && !inOrg(owner)) {
  fail(
    `You're not in the "${owner}" GitHub org yet. Ask an org owner to add you,\n` +
      `or keep it under your own account for now:  npm run online -- --owner ${githubUser}`,
  );
}
if (!onGitHub && run("gh", ["repo", "view", repo]).ok) {
  fail(`${repoUrl} already exists. Pick another name:  npm run online -- --name <new-name>`);
}

const linkedId = linkedProjectId();
let project = linkedId ? vercelProject(linkedId) : null;
if (linkedId && !project) {
  fail("This folder is linked to a Vercel project that no longer exists. Delete the .vercel folder and run this again.");
}
// A project with this name that's already connected to this repo (say, from
// the Deploy button) is this app's project; any other is a name clash.
const sameName = project ? null : vercelProject(name);
const sameRepo = sameName?.link && `${sameName.link.org}/${sameName.link.repo}` === repo;
if (sameName && !sameRepo) {
  fail(`You already have a Vercel project called "${name}". Pick another name:  npm run online -- --name <new-name>`);
}
if (sameRepo) project = sameName;
const connected = Boolean(project?.link);
const hasDatabase = () => {
  const envs = vercel(["env", "ls", "production", "--json"]);
  return envs.ok && parseJson(envs.out, "the settings").envs.some((e) => e.key === "DATABASE_URL");
};
const databaseAdded = linkedId ? hasDatabase() : false;
const deployed = Boolean(project?.targets?.production);

if (!go) {
  const step = (done, text) => console.log(`  ${done ? "✓" : "•"} ${text}`);
  if (ownerNote) console.log(`\n${ownerNote}`);
  console.log("\nHere's what will happen:\n");
  step(onGitHub, onGitHub
    ? `Already on GitHub: ${repoUrl}`
    : `Create a PUBLIC GitHub repo ${repoUrl} and upload your code (anyone can read it, so no secrets in the code)`);
  step(Boolean(project), project
    ? `Already on Vercel: project "${project.name}"`
    : `Create a Vercel project "${name}" in ${vercelUser}'s Vercel account`);
  step(connected, "Connect them, so every change uploaded to GitHub goes online by itself");
  step(databaseAdded, "Add a free Neon database for the live app (your computer keeps its own, separate one)");
  step(deployed, deployed ? `Already online: ${productionAddress(project)}` : "Put it online for the first time");
  if (!deployed) {
    console.log(`\nYour address will probably be https://${name}.vercel.app (Vercel may add a few letters if that's taken).`);
    console.log("It can't change once you've linked it on the Vibes page, so choose the name you want now.");
  }
  console.log("\nTo go ahead, run:  npm run online -- --yes" + args.filter((a) => a !== "--yes").map((a) => ` ${a}`).join("") + "\n");
  process.exit(0);
}

// --- 1. GitHub ---------------------------------------------------------------

if (run("git", ["status", "--porcelain"]).out.trim()) {
  console.log("Saving your latest changes…");
  run("git", ["add", "-A"]);
  const saved = run("git", ["commit", "-m", "Save changes"]);
  if (!saved.ok) fail(`Couldn't save your changes in git.\n${saved.err.trim() || saved.out.trim()}`);
}

if (onGitHub) {
  console.log("Uploading to GitHub…");
  const pushed = run("git", ["push", "-u", "origin", "HEAD"]);
  if (!pushed.ok) fail(`Couldn't upload to GitHub.\n${pushed.err.trim()}`);
} else {
  console.log(`Creating ${repoUrl} and uploading your code…`);
  const created = run("gh", ["repo", "create", repo, "--public", "--source=.", "--push"]);
  if (!created.ok) fail(`Couldn't create the GitHub repo.\n${created.err.trim()}`);
}

// --- 2. Vercel project -------------------------------------------------------

if (project && !linkedId) {
  // Found by name above; link this folder to it so later commands use its id.
  const linked = vercel(["link", "--yes", "--project", project.id]);
  if (!linked.ok) fail(`Couldn't link this folder to the Vercel project.\n${linked.err.trim()}`);
}
if (!project) {
  console.log(`Creating the Vercel project "${name}"…`);
  const added = vercel(["project", "add", name]);
  if (!added.ok) fail(`Couldn't create the Vercel project.\n${added.err.trim()}`);
  const linked = vercel(["link", "--yes", "--project", name]);
  if (!linked.ok) fail(`Couldn't link this folder to the Vercel project.\n${linked.err.trim()}`);
  project = vercelProject(linkedProjectId());
}

// --- 3. Connect Vercel to GitHub ---------------------------------------------

if (!project.link) {
  console.log("Connecting Vercel to GitHub…");
  // No address: given one, the CLI asks "Do you still want to connect?", which
  // nobody answers here. Without it, it uses this folder's GitHub remote.
  // It can also report success when it failed, so check the project instead.
  const connect = vercel(["git", "connect"]);
  project = vercelProject(project.id);
  if (!project.link) {
    fail(
      `Vercel couldn't connect to ${repoUrl}. Usually its GitHub app isn't allowed to see this repo.\n` +
        `Open https://github.com/apps/vercel/installations/new, click "${owner}", and under\n` +
        `Repository access choose All repositories (or add ${name}). Save, then run this again.\n\n` +
        `${connect.out.trim()}\n${connect.err.trim()}`.trim(),
    );
  }
}

// --- 4. Database for the live app -------------------------------------------
// Production only, and not copied to .env.local: the live data stays online,
// and every computer keeps its own local database.

if (!hasDatabase()) {
  console.log("Adding a free Neon database for the live app…");
  const before = helpFiles();
  const db = vercel(["integration", "add", "neon", "--name", `${name}-db`, "--environment", "production", "--no-env-pull"]);
  // Adding Neon also drops general coding-assistant docs into the project
  // (.agents/, .claude/skills/, skills-lock.json). Some of their advice, like
  // copying the live database address locally or using Neon's own sign-in,
  // contradicts AGENTS.md, so anything new there is removed again.
  for (const path of helpFiles()) {
    if (!before.has(path)) rmSync(path, { recursive: true, force: true });
  }
  if (!db.ok) {
    fail(
      "Couldn't add the database. The first time, Neon asks you to accept its terms,\n" +
        "and that has to be done by you, not your agent. Open the Terminal app and run:\n" +
        "  npx vercel integration accept-terms neon\n" +
        "(Or open https://vercel.com/marketplace/neon, click Install, accept, and stop there.)\n\n" +
        db.err.trim(),
    );
  }
}

// --- 5. First deploy (later changes go online when they're pushed) -----------

if (!project.targets?.production) {
  console.log("Putting it online for the first time (about 2 minutes)…");
  const deploy = vercel(["deploy", "--prod", "--yes"]);
  if (!deploy.ok) fail(`The deploy didn't work.\n${deploy.err.trim()}`);
  project = vercelProject(project.id);
} else {
  // Vercel should build every push to GitHub, but on the free plan it skips
  // commits it can't match to the project's owner. Check, and deploy directly
  // if it hasn't picked this one up.
  const sha = run("git", ["rev-parse", "HEAD"]).out.trim();
  console.log("Checking Vercel has picked up your changes…");
  let found;
  for (let i = 0; i < 12 && !found; i++) {
    const list = vercel(["ls", "--json", "--limit", "5"]);
    found = list.ok && parseJson(list.out, "the deployments").deployments.find((d) => d.meta?.githubCommitSha === sha);
    if (!found) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (found) {
    // Wait for the build to finish, so "online" means online.
    console.log("Vercel is building it (a minute or two)…");
    let state = found.state;
    for (let i = 0; i < 36 && !["READY", "ERROR", "CANCELED"].includes(state); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const list = vercel(["ls", "--json", "--limit", "5"]);
      state = list.ok
        ? parseJson(list.out, "the deployments").deployments.find((d) => d.url === found.url)?.state
        : state;
    }
    if (state === "ERROR" || state === "CANCELED") {
      fail(
        "Vercel couldn't build this change, so the live app still has the previous version.\n" +
          `To see why:  npx vercel inspect ${found.url} --logs`,
      );
    }
    if (state !== "READY") console.log("It's taking a while; it should be online in a few minutes.");
  } else {
    console.log(
      "Vercel didn't pick up this change from GitHub, so putting it online directly.\n" +
        "(On Vercel's free plan, only the project owner's changes go online by themselves.)",
    );
    const deploy = vercel(["deploy", "--prod", "--yes"]);
    if (!deploy.ok) fail(`The deploy didn't work.\n${deploy.err.trim()}`);
  }
}

const address = productionAddress(project);
console.log(`\n✓ Your app is online at ${address ?? `https://${name}.vercel.app`}`);
console.log(`  Code: ${repoUrl}`);
if (owner !== ORG) {
  const state = orgState(ORG);
  console.log(
    state === "active"
      ? `\nYou're in the ${ORG} GitHub org now. Consider moving this app there:\nthe repo's Settings → Transfer ownership → ${ORG}.`
      : `\n${JOIN_ORG}\nOnce you're in, you can move this app there (the repo's Settings → Transfer ownership).`,
  );
}
const envLocal = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
if (!/^SANDBOX_AUTH_CLIENT_ID=\S/m.test(envLocal)) {
  console.log("\nNext: link that address on https://members.sandbox.is/vibes (with local port 3000),");
  console.log("then, once an admin approves it, ask your agent to finish setup.\n");
}
