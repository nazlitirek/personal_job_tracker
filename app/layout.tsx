import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Job Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <strong>Job Tracker</strong>
          <nav>
            <Link href="/">Jobs</Link>
            <Link href="/tracker">Tracker</Link>
            <Link href="/cv">CV</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
