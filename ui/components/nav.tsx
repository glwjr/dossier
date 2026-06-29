"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, FileText, Globe, Search } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/programs", label: "Programs" },
  { href: "/requirements", label: "Requirements" },
  { href: "/timeline", label: "Timeline" },
  { href: "/recommenders", label: "Recommenders" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      pathname === href ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Dossier
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            title="Search (⌘K)"
            aria-label="Search"
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            href="/outreach"
            title="Outreach"
            className={`transition-colors hover:text-foreground ${pathname === "/outreach" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <Globe className="h-4 w-4" />
          </Link>
          <Link
            href="/documents"
            title="Documents"
            className={`transition-colors hover:text-foreground ${pathname === "/documents" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <FileText className="h-4 w-4" />
          </Link>
          <Link
            href="/account"
            title="Account"
            className={`transition-colors hover:text-foreground ${pathname === "/account" ? "text-foreground" : "text-muted-foreground"}`}
          >
            <CircleUser className="h-4 w-4" />
          </Link>
          <button
            onClick={toggle}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="cursor-pointer text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-4">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={linkClass(href)}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="flex items-center justify-center gap-5 border-t pt-3">
              <button
                onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("open-command-palette")); }}
                aria-label="Search"
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                href="/outreach"
                aria-label="Outreach"
                className={`transition-colors hover:text-foreground ${pathname === "/outreach" ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setOpen(false)}
              >
                <Globe className="h-5 w-5" />
              </Link>
              <Link
                href="/documents"
                aria-label="Documents"
                className={`transition-colors hover:text-foreground ${pathname === "/documents" ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setOpen(false)}
              >
                <FileText className="h-5 w-5" />
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                className={`transition-colors hover:text-foreground ${pathname === "/account" ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setOpen(false)}
              >
                <CircleUser className="h-5 w-5" />
              </Link>
              <button
                onClick={() => { toggle(); setOpen(false); }}
                aria-label="Toggle theme"
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                {theme === "dark" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                  </svg>
                )}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
