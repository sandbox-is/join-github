# Sandbox app starter

A small Next.js app where Sandbox members sign in with their Sandbox account.
It's a starting point: the person you're helping will ask you to build their
idea on top of it. They may not be an engineer, so explain in plain words.

The usual order:

1. **Build** on their computer with test sign-in (`npm run dev`).
2. **Put it online** when it's ready to show (`npm run online`, below).
3. They **link it** on https://members.sandbox.is/vibes and wait for an admin.
4. After approval, **finish setup** (`npm run setup`, below).

They may also have started from the Deploy button, in which case it's already
on GitHub and Vercel; the same commands work.

## Rules

If any other docs or skills in this project disagree with this file, this file
wins.

- **Never ask for, print or paste secret values.** Not in the chat, not in code,
  not in commits. Refer to settings by name only. If a value is needed, tell the
  person where to put it (`.env.local` on their computer, or Vercel → Settings →
  Environment Variables) and let them do it.
- **Secrets stay on the server.** Never read `SANDBOX_AUTH_CLIENT_SESSION_SECRET`
  or `SANDBOX_MEMBERS_TOKEN` in a client component (`"use client"`), and never
  prefix them with `NEXT_PUBLIC_`. `SANDBOX_AUTH_CLIENT_ID` is not secret.
- **Keep the callback at `/api/auth/callback`.** Sandbox only sends people back
  to that exact path. Don't move or rename it.
- **Don't commit `.env.local`.** It's git-ignored; keep it that way.
  `.env.example` lists the names with no values.
- **The repo is public.** Anyone can read the code, so no secrets, member data
  or private notes in it. Data belongs in the database.
- **Never change or delete an existing migration**, and never drop a table or
  column without asking the person first. Live data can't be recovered from code.

## Settings

| name | what it is |
|---|---|
| `SANDBOX_AUTH_CLIENT_ID` | the app's ID, shown on the Vibes page once an admin approves the app |
| `SANDBOX_AUTH_CLIENT_SESSION_SECRET` | a long random string that signs the session cookie |
| `SANDBOX_ADMINS` | optional: admins' Sandbox emails, comma-separated |
| `DATABASE_URL` | the live database, added by `npm run online`. Never put it in `.env.local` |

Until both are set, the app still builds and runs, and the login page shows a
setup guide instead of the sign-in button. If the person is stuck, point them
to that page: it tells them what's missing and what to do.

### Putting it online

When they ask to put it online (or save it to GitHub), first run:

```bash
npm run online
```

It changes nothing: it prints what it would do. Show them, and check two
things with them before going ahead:

- **The name.** It becomes the address (`<name>.vercel.app`), which can't change
  once it's linked on the Vibes page. Default: this folder's name; change it
  with `--name <name>`.
- **Where the code lives.** Most Sandbox apps live in the `sandbox-is` GitHub
  org, where members can find them and help, so encourage that. It's used
  automatically if they're in it. If the plan says they're not (or haven't
  accepted an invite), tell them, and ask whether to wait until they've joined
  or go ahead under their own account and move it later. Either way the repo
  is public, so no secrets or member data in the code.

Then run it with `--yes` and the same options. It's safe to run again: each
step checks what's already done. After the first time, it just saves and
uploads their changes, and Vercel puts them online.

- Not signed in? Ask them to run `! gh auth login` or `! npx vercel login`.
- The first time, Vercel's GitHub app may not be allowed to see the new repo.
  The script stops and says how to allow it; then run it again.
- Until the app is approved and set up, the live address shows "Coming soon"
  to visitors (the setup steps are behind a toggle). Suggest they don't share
  the link until then.
- The first database needs them to accept Neon's terms, which you can't do for
  them, and it won't work through `!`. Ask them to open the Terminal app and run
  `npx vercel integration accept-terms neon` (or, on the website, click Install
  at https://vercel.com/marketplace/neon, accept, and stop there). It's once per
  Vercel account. Then run `npm run online -- --yes` again.
- Not in the `sandbox-is` org? Suggest their own account for now.
- Pushed changes not going online? Run `npm run online` and check it shows
  "✓ Connect them". If not, Vercel's GitHub app can't see the repo: `--yes`
  will say how to fix it. If it is connected, remember that on Vercel's free
  plan only commits by the project owner deploy, from an email linked to their
  GitHub account (`git config user.email`).

### Finishing setup

When the person says their app is approved (or asks you to finish setup), ask
for their app ID from the Vibes page, and who should be admins (their Sandbox
emails; add them with `--admins`). It isn't secret: it appears in every
sign-in page. Then run:

```bash
npm run setup -- <app ID>
```

It saves the ID in Vercel, makes the session secret and saves it without
showing it to anyone (you included), fills in `.env.local`, and redeploys.
Never generate, print or ask for the secret yourself; the script handles it.

- If it says they're not signed in to Vercel, ask them to run `npx vercel login`
  themselves (in Claude Code: type `! npx vercel login`). It opens a browser.
- If it says the app isn't on GitHub or Vercel yet, run `npm run online` first.

### Working on someone else's app

If they're helping with an app someone else owns:

1. `git clone` it, `npm install`, `npm run dev`. Test sign-in works straight away.
2. For real sign-in on their computer, get the app ID (the owner has it, and
   it's in the page source of the app's login page) and run
   `npm run setup -- <app ID> --local-only`. That only fills in `.env.local`
   with its own secret; it never touches Vercel or the live app.
3. Make changes on a branch and open a pull request (`gh pr create`) for the
   owner to accept. Don't run `npm run online` or a full `npm run setup` on an
   app they don't own.

### Moving an app into sandbox-is later

On GitHub, the repo's Settings → Transfer ownership → `sandbox-is` (they need
to be in the org). Then run `npm run online` and check it still shows
"✓ Connect them"; if not, Vercel's GitHub app needs access to `sandbox-is`
(an org owner allows it). The address doesn't change, so no relinking.

### Removing an app

Four places, all by the person (each asks them to confirm): the Vercel project
(Settings → Delete), its Neon database (Vercel's Storage tab: deleting the
project doesn't remove it), the GitHub repo (Settings → Delete), and the link
on the Vibes page.

Sign-in only works at the address the app was linked with (and localhost, if
they gave a port). Vercel preview links won't work, and a new address means
linking again on https://members.sandbox.is/vibes.

### When something's wrong

| what they see | what's going on |
|---|---|
| "Coming soon" online, or "Almost there" on their computer | Setup isn't finished. The page lists what's missing. |
| No sign-in button | The app ID is mistyped, or the app isn't approved yet. |
| Sandbox says the return address isn't allowed | They're on a different address from the one they linked (a Vercel preview link, say). A new address means linking again. |
| Settings changed but nothing different | Vercel only picks up new settings after a redeploy (`npm run setup` does one). |
| Signed in, but sent back to the login page | The session secret changed. Signing in again fixes it. |
| Changes not online | Run `npm run online`: it checks the connection, waits for the build, and says what failed. |

More in the [sandbox-auth troubleshooting guide](https://github.com/cesarsalazar/sandbox-auth/tree/v0.7.1#troubleshooting).

## Storing data

Use the database in `lib/db.ts` for anything the app needs to remember:

```ts
import { sql } from "@/lib/db";

await sql`insert into rsvps (dinner_id, member_sub) values (${dinnerId}, ${member.sub})`;
const rows = await sql<{ name: string }>`select name from members where sub = ${sub}`;
```

- Always put values in `${}`; they're sent safely. Never build SQL by joining strings.
- On their computer it's a local Postgres in `.data/` (nothing to set up, and
  each computer has its own). Online it's a Neon Postgres, added by
  `npm run online`. Live data is never copied to their computer, or back.
- Vercel doesn't keep files between visits, so never save data to files.

**Changing what's stored** (new tables, new columns) is always a new file in
`db/migrations/`, numbered after the last one: `002_add_dinners.sql`,
`003_add_rsvp_notes.sql`. Write plain Postgres SQL. The local database applies
new files the next time the app uses it; the live one applies them when the
change goes online. Never edit a file that's already been applied: add a new one.

To start the local database afresh, stop the app, delete `.data/`, and start
it again (deleting it while the app runs confuses the database).

To look at the live data, they can open Neon's table viewer with
`npx vercel integration open neon`.

### Members

`db/migrations/001_members.sql` has a `members` table (`sub`, `name`, `email`,
`picture`, `first_seen_at`, `last_seen_at`). `getMember()` fills it in whenever
someone signs in, so pages can show other members' names and photos: store a
member's `sub` in your own tables and join to `members` for their details.

The app only knows members who've signed in to it. To find members who haven't,
see "Member data" under the Vibes prompts below (needs separate approval).

### Admins

```ts
import { isAdmin } from "@/lib/admin";

if (!isAdmin(member)) redirect("/");
```

Admins are listed by their Sandbox email in `SANDBOX_ADMINS` (comma-separated).
With test sign-in and nobody listed, the test member is an admin, so admin pages
can be built; to try the app as a non-admin, put someone else's email in
`SANDBOX_ADMINS` in `.env.local`. Ask who the admins are when finishing setup,
and pass them with `--admins`. Check `isAdmin` on the server, in every page,
route handler and server action that needs it, not just by hiding buttons.

## Common next steps

- **Photos and files:** use Vercel Blob (see `npx vercel storage --help`, or
  the Storage tab of the Vercel project). Store each file's URL in the database.
- **Emails:** use an email service from the Vercel Marketplace, such as Resend
  (`npx vercel integration add resend`). Send from server code only.
- **Reminders and scheduled jobs:** Vercel Cron Jobs, set in `vercel.json`,
  calling a route handler. Protect that route with the `CRON_SECRET` Vercel sets.
- **Looking up members:** see "Member data" below.
- **A custom address** (like `dinners.example.com`): Sandbox sign-in is tied to
  the address the app was linked with, so a new address means linking again on
  the Vibes page. Warn the person before they set one up.

Check each service's current docs before using it: these change often.

## How sign-in works

It uses [sandbox-auth](https://github.com/cesarsalazar/sandbox-auth/tree/v0.7.1#readme)
(pinned to v0.7.1 in `package.json`). Read that README before changing anything
about sign-in.

| file | job |
|---|---|
| `app/login/page.tsx` | the Sign in with Sandbox button, and sign-in error messages |
| `app/login/setup-guide.tsx` | what the login page shows until both settings are set |
| `lib/setup.ts` | which settings are missing, and whether test sign-in is on |
| `lib/session.ts` | `getMember()`: the signed-in member (real, or the test member), saved to `members` |
| `lib/db.ts` | `sql`: the database (local on their computer, Neon online) |
| `lib/admin.ts` | `isAdmin(member)`: from `SANDBOX_ADMINS` |
| `db/migrations/` | every change to what's stored, in order |
| `db/migrate.mjs`, `scripts/migrate.mjs` | apply migrations (locally when used; online before each build) |
| `components/avatar.tsx` | a member's photo, or their initial |
| `scripts/online.mjs` | `npm run online`: GitHub repo, Vercel project, first deploy |
| `scripts/setup.mjs` | `npm run setup`: saves both settings in Vercel and redeploys |
| `scripts/lib.mjs` | helpers shared by the two scripts |
| `app/api/auth/callback/route.ts` | where Sandbox sends people back; sets the session cookie |
| `app/api/auth/logout/route.ts` | signs out of this app |
| `proxy.ts` | sends signed-out people to `/login`; edit `PUBLIC` to open pages to everyone |
| `app/page.tsx` | the signed-in home page: the member's name and photo |

To get the signed-in member in a server component, route handler or server action:

```ts
import { getMember } from "@/lib/session";

const member = await getMember();
// { sub, name, email, picture?, phone_number?, member_data?, iat } | null
```

Always use `getMember`, not sandbox-auth's `getSession`: it's the same, but it
also works with test sign-in.

### Test sign-in

Under `npm run dev`, until both settings are set, everyone is signed in as a
test member ("Test Member", `lib/session.ts`) and a banner says so. That lets
the person build and try every page before their app is approved. It never
turns on in a production build (`next build`/`next start`, which is what Vercel
runs), and it switches off by itself once `npm run setup` has filled in
`.env.local`. Don't remove the `NODE_ENV` check in `lib/setup.ts`.

- `member.sub` is their permanent Sandbox ID. Use it as the key when you store
  anything about a member.
- Sandbox says **who** someone is, not **what they may do**. Keep roles and
  permissions in the app's own database, looked up by `member.sub`.
- Extra profile fields (`preferred_name`, `current_city`, `current_hub`,
  `entry_hub`, `member_since`, `date_of_birth`) arrive in `member.member_data`
  only if the app asked for them when it was linked **and** the member agreed.
  Always treat them as possibly missing.

## Commands

`npm install` may warn that an install script (`unrs-resolver`, used by the
linter) wasn't approved. That's expected and harmless: don't approve it.

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
npm run online              # show what putting it online would do
npm run online -- --yes     # put it online (or upload new changes)
npm run setup -- <app ID> --admins a@x.com,b@y.com   # after approval: saves settings in Vercel and redeploys
                                                     # (--admins replaces the list; --admins none removes it)
npm run setup -- <app ID> --local-only   # real sign-in on this computer only
```

Signing in on localhost only works if the app was linked with local port 3000
on the Vibes page.

## The Vibes prompts

These are the prompts from https://members.sandbox.is/vibes, kept here so you
always have them.

### Sign in with Sandbox (used by this app)

> Add Sign in with Sandbox to this app. Follow the sandbox-auth README:
> https://github.com/cesarsalazar/sandbox-auth/tree/v0.7.1#readme
>
> The app's ID from Sandbox goes in SANDBOX_AUTH_CLIENT_ID. If it isn't set, build the rest and tell me to get one from the Vibes page at https://members.sandbox.is/vibes.

### Member data (not used by this app; needs separate admin approval)

Only for apps that must look up *other* members by email or phone. Most apps
don't need it. If the person wants it, they request access on the Vibes page
first, then add `SANDBOX_MEMBERS_TOKEN`. Call it only from server code.

> You can call the Sandbox Members API.
>
> Base URL: https://members.sandbox.is
> OpenAPI:  https://members.sandbox.is/api/v1/openapi.json
>
> Fetch the OpenAPI document first — it is public, and it lists every operation,
> parameter, and error code. Treat it as the source of truth over anything you
> recall about this API.
>
> Authenticate with the token in the SANDBOX_MEMBERS_TOKEN environment variable:
>   Authorization: Bearer $SANDBOX_MEMBERS_TOKEN
>
> Read it from the environment at call time. If it is not set, say so and stop:
> tokens come from the Vibes page in the members app, and one should be put in
> your environment rather than into this conversation.
>
> On failure, branch on the error's "code"; the "message" is prose and may be
> reworded. A 401 with "invalid_token" usually means the token was rotated or
> revoked — tokens here are replaced in place, with no overlap period. Unknown
> and revoked tokens are reported identically, so you cannot tell them apart.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
