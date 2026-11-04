import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = { title: "Job Tracker" };

// latin-ext has the Turkish letters. Next.js stores these fonts inside the site.
const title = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-title", weight: ["400", "500", "600"] });
const body = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-body" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${title.variable} ${body.variable}`}>
      <body>
        <header className="top">
          <span className="brand">🌸 Job Tracker</span>
          <Nav />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
