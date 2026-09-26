// Everything this app asks of GitHub. Server code only: the settings below
// are secret (except the client id) and must never reach the browser.
//
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET  the GitHub OAuth app, which tells
//                                           us which GitHub account is theirs
//   GITHUB_ORG_INVITE_TOKEN                 an org owner's token with
//                                           "Members: Read and write" on the org

export const ORG = "sandbox-is";
export const INVITATION_URL = `https://github.com/orgs/${ORG}/invitation`;

// GitHub sends people back here. Sandbox's own callback is /api/auth/callback.
export const CALLBACK_PATH = "/api/github/callback";
// Holds the random "state" between sending them to GitHub and their return.
export const STATE_COOKIE = "github_oauth_state";

export const GITHUB_SETTINGS = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_ORG_INVITE_TOKEN"] as const;

export function missingGitHubSettings() {
  return GITHUB_SETTINGS.filter((name) => !process.env[name]);
}

// Connecting GitHub needs only the OAuth app. Sending invites also needs the
// org owner's token; until it's set, members can link but aren't invited.
export function canConnect() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function canInvite() {
  return Boolean(process.env.GITHUB_ORG_INVITE_TOKEN);
}

export function avatarUrl(githubId: number | string) {
  return `https://avatars.githubusercontent.com/u/${githubId}?s=192`;
}

function setting(name: (typeof GITHUB_SETTINGS)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} isn't set. See .env.example.`);
  return value;
}

const API_HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

// No scope: GitHub then only lets us read their public profile.
export function authorizeUrl(state: string, redirectUri: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", setting("GITHUB_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: setting("GITHUB_CLIENT_ID"),
      client_secret: setting("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
  });
  // GitHub answers 200 even for errors, with an "error" field.
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`GitHub didn't give an access token (HTTP ${res.status}, ${body.error ?? "no error code"})`);
  }
  return body.access_token;
}

export type GitHubUser = { id: number; login: string };

export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: { ...API_HEADERS, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Reading the GitHub profile failed (HTTP ${res.status})`);
  const { id, login } = (await res.json()) as GitHubUser;
  return { id, login };
}

// Once we've read their profile we don't need the token, so we ask GitHub to
// cancel it rather than just forgetting it. A failure here is logged, not
// shown: the token was never stored and only reads a public profile.
export async function revokeToken(accessToken: string) {
  const clientId = setting("GITHUB_CLIENT_ID");
  const basic = Buffer.from(`${clientId}:${setting("GITHUB_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(`https://api.github.com/applications/${clientId}/token`, {
    method: "DELETE",
    headers: { ...API_HEADERS, Authorization: `Basic ${basic}` },
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (res.status !== 204) console.error(`Cancelling the GitHub token failed (HTTP ${res.status})`);
}

// "member": in the org. "invited": has an invite they haven't accepted yet.
// "none": neither (never invited, invite expired, or they left).
export type OrgStatus = "member" | "invited" | "none";

export async function orgStatus(login: string): Promise<OrgStatus> {
  const res = await fetch(`https://api.github.com/orgs/${ORG}/memberships/${encodeURIComponent(login)}`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${setting("GITHUB_ORG_INVITE_TOKEN")}` },
    cache: "no-store",
  });
  if (res.status === 404) return "none";
  if (!res.ok) throw new Error(`Checking ${login}'s ${ORG} membership failed (HTTP ${res.status})`);
  const { state } = (await res.json()) as { state: "active" | "pending" };
  return state === "active" ? "member" : "invited";
}

export async function inviteToOrg(githubId: number) {
  const res = await fetch(`https://api.github.com/orgs/${ORG}/invitations`, {
    method: "POST",
    headers: { ...API_HEADERS, Authorization: `Bearer ${setting("GITHUB_ORG_INVITE_TOKEN")}` },
    body: JSON.stringify({ invitee_id: githubId, role: "direct_member" }),
  });
  if (res.status !== 201) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Inviting GitHub user ${githubId} to ${ORG} failed (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }
}

// Their username today. People can rename their GitHub account; the id stays.
export async function currentLogin(githubId: number) {
  const res = await fetch(`https://api.github.com/user/${githubId}`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${setting("GITHUB_ORG_INVITE_TOKEN")}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Looking up GitHub user ${githubId} failed (HTTP ${res.status})`);
  return ((await res.json()) as GitHubUser).login;
}
