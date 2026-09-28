import { notFound } from "next/navigation";
import { JoinScreen, type View } from "../join-screen";

// Every step of the home page with made-up data, for checking the design.
// Only on your computer (npm run dev): it's a 404 online.
const SAMPLE = { githubId: "583231", login: "octocat" }; // GitHub's mascot account

const VIEWS: Record<string, View> = {
  connect: { kind: "connect" },
  confirm: { kind: "confirm", ...SAMPLE },
  invited: { kind: "invited", ...SAMPLE },
  member: { kind: "member", ...SAMPLE },
  none: { kind: "none", ...SAMPLE },
  "no-invites": { kind: "no-invites", ...SAMPLE },
  unknown: { kind: "unknown", ...SAMPLE },
  paused: { kind: "paused", ...SAMPLE },
  setup: { kind: "setup", missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] },
};

export default async function Preview({ searchParams }: { searchParams: Promise<{ view?: string; error?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view = "connect", error } = await searchParams;
  return <JoinScreen member={{ name: "Test Member" }} view={VIEWS[view] ?? VIEWS.connect} error={error} />;
}
