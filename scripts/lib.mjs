// Helpers shared by the setup scripts. Messages are written for someone who
// isn't an engineer, since an agent usually relays them word for word.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export function fail(message) {
  console.error(`\n✗ ${message}\n\nIt's safe to run this again once that's sorted.\n`);
  process.exit(1);
}

export function run(command, args, input) {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  return {
    ok: result.status === 0,
    out: result.stdout ?? "",
    err: result.stderr ?? "",
    notInstalled: result.error?.code === "ENOENT",
  };
}

// The Vercel CLI. Secret values go in through stdin, so they never appear in a
// process list or in any output.
export function vercel(args, input) {
  return run("npx", ["--yes", "vercel@60", ...args, "--non-interactive"], input);
}

export function parseJson(text, what) {
  try {
    return JSON.parse(text.slice(text.indexOf("{")));
  } catch {
    fail(`Couldn't read ${what} from Vercel.`);
  }
}

// A project from the Vercel API, or null if there's no such project.
export function vercelProject(nameOrId) {
  const result = vercel(["api", `/v9/projects/${encodeURIComponent(nameOrId)}`, "--raw"]);
  if (!result.ok) {
    if (/not found|404/i.test(result.err)) return null;
    fail(`Couldn't look up the Vercel project "${nameOrId}".\n${result.err.trim()}`);
  }
  return parseJson(result.out, "the project");
}

// The Vercel project this folder is linked to, from .vercel/project.json.
export function linkedProjectId() {
  if (!existsSync(".vercel/project.json")) return null;
  try {
    return JSON.parse(readFileSync(".vercel/project.json", "utf8")).projectId ?? null;
  } catch {
    fail("The file .vercel/project.json is damaged. Delete the .vercel folder and run this again.");
  }
}

export function requireVercelLogin() {
  const who = vercel(["whoami"]);
  if (!who.ok) fail("You're not signed in to Vercel. Run  npx vercel login  and try again.");
  return who.out.trim().split("\n").pop();
}

// The app's main address, like https://hub-dinners.vercel.app.
export function productionAddress(project) {
  const aliases = project.targets?.production?.alias ?? [];
  const main = aliases.find((a) => a === `${project.name}.vercel.app`) ?? aliases[0];
  return main ? `https://${main}` : null;
}
