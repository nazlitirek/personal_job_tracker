"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", label: "Jobs" },
  { href: "/tracker", label: "Tracker" },
  { href: "/cv", label: "CV" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav>
      {PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className={path === page.href ? "active" : undefined}
          aria-current={path === page.href ? "page" : undefined}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
