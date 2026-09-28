import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Logo } from "@/components/logo";
import { isAdmin } from "@/lib/admin";
import { getMember } from "@/lib/session";
import { testSignIn } from "@/lib/setup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings: a book serif, to sit with the Sandbox wordmark.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Join Sandbox on GitHub",
  description: "Sandbox members join the sandbox-is GitHub org",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const member = await getMember();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {testSignIn() && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            Test sign-in: you&apos;re &ldquo;Test Member&rdquo;. Real Sandbox sign-in starts
            once your app is approved and set up. Data here is saved on your computer only.
          </div>
        )}
        <header className="flex items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-brand" aria-label="Join Sandbox on GitHub, home">
            <Logo height={22} />
          </Link>
          {member && (
            <nav className="flex items-center gap-5 text-sm text-muted">
              {isAdmin(member) && (
                <Link href="/admin" className="hover:text-foreground">
                  Who&apos;s joined
                </Link>
              )}
              <form action="/api/auth/logout" method="post">
                <button className="hover:text-foreground">Sign out</button>
              </form>
            </nav>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
