# Join Sandbox on GitHub

Sandbox members join the [sandbox-is](https://github.com/sandbox-is) GitHub
organization by themselves, without waiting for an admin.

**Live at https://join-github.vercel.app**

<p>
  <img src="docs/connect.png" width="260" alt="Step 1: Join Sandbox on GitHub, with a Connect GitHub button.">
  <img src="docs/confirm.png" width="260" alt="Step 2: Is this you on GitHub? showing the GitHub avatar and username, with Yes, invite and Not me buttons.">
</p>
<p>
  <img src="docs/invited.png" width="260" alt="Step 3: Your invite is waiting, with an Accept the invite button.">
  <img src="docs/member.png" width="260" alt="Done: You're in, with a link to open sandbox-is on GitHub.">
</p>

## How it works

1. **Sign in with Sandbox.** That proves you're a member.
2. **Connect GitHub.** You sign in on GitHub so the app knows which account is
   yours. It only sees your public profile, and doesn't keep GitHub's access.
3. **Confirm it's you.** The app shows your GitHub username and photo.
4. **Accept the invite.** The app sends an invite to sandbox-is; accept it at
   [github.com/orgs/sandbox-is/invitation](https://github.com/orgs/sandbox-is/invitation).
   If you're already in, or already invited, it says so instead.

Each Sandbox member can link one GitHub account, and each GitHub account can
belong to one member. Invites expire after 7 days; come back to the app for a
new one.

## For admins

Admins (listed in `SANDBOX_ADMINS`) see **Who's joined**: everyone who has
linked a GitHub account, and when they were invited.

**Unlink** removes a member's pairing so they can connect a different GitHub
account. It doesn't remove anyone from the GitHub org: do that on GitHub
(sandbox-is → People) if needed. While their pairing remains, a member who was
removed from the org can send themselves a new invite.

## Looking after it

- **The invite token expires.** Invites are sent with a sandbox-is owner's
  token. When it expires or is revoked, members see "Invites are paused". Ask
  an owner for a new one (below) and replace `GITHUB_ORG_INVITE_TOKEN` in
  Vercel → join-github → Settings → Environment Variables, then redeploy.
- **Invites come from that owner's GitHub account**, since it's their token.
- **Data** (who linked which GitHub account) is in the app's Neon database.
  To look at it: `npx vercel integration open neon`.

## Settings

Put these in `.env.local` on your computer, or in Vercel online. Never commit
them or paste them into a chat. `.env.example` lists the names.

| name | what it is |
|---|---|
| `SANDBOX_AUTH_CLIENT_ID` | the app's ID from the [Vibes page](https://members.sandbox.is/vibes) (not secret) |
| `SANDBOX_AUTH_CLIENT_SESSION_SECRET` | signs the sign-in cookie; made by `npm run setup` |
| `SANDBOX_ADMINS` | admins' Sandbox emails, comma-separated |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | the GitHub OAuth app (see below) |
| `GITHUB_ORG_INVITE_TOKEN` | a sandbox-is owner's token that can send invites |

### The GitHub side

- **Two GitHub OAuth apps** (github.com/settings/developers → OAuth Apps), one
  for computers and one for the live site, because each allows one return
  address:
  - `http://localhost:3000/api/github/callback`: its ID and secret go in `.env.local`
  - `https://join-github.vercel.app/api/github/callback`: its ID and secret go in Vercel

  They ask for no permissions. GitHub's return path is kept apart from
  Sandbox's (`/api/auth/callback`).
- **The invite token:** a sandbox-is owner makes a fine-grained token at
  github.com/settings/personal-access-tokens/new with resource owner
  **sandbox-is**, repository access **Public repositories**, and organization
  permission **Members: Read and write**. Nothing else.

## Working on it

```bash
git clone https://github.com/sandbox-is/join-github
cd join-github
npm install
npm run dev          # http://localhost:3000
```

Until the settings are filled in, you're signed in as "Test Member" and data
stays on your computer. To see every step with made-up data, open
http://localhost:3000/preview?view=confirm (also `connect`, `invited`,
`member`, `none`, `paused`, `unknown`, `no-invites`, `setup`).

For real sign-in on your computer, ask the owner for the app ID and run
`npm run setup -- <app ID> --local-only`. Send changes as a pull request.

`AGENTS.md` has the details for AI agents (and humans): where things are, the
rules, and how to put changes online.

Built from the [Sandbox app starter](https://github.com/sandbox-is/sandbox-starter):
Next.js, Tailwind, [sandbox-auth](https://github.com/cesarsalazar/sandbox-auth),
Postgres (Neon online), hosted on Vercel.
