import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { testSignIn } from "@/lib/setup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sandbox app",
  description: "A Sandbox members app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {testSignIn() && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            Test sign-in: you&apos;re &ldquo;Test Member&rdquo;. Real Sandbox sign-in starts
            once your app is approved and set up. Data here is saved on your computer only.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
