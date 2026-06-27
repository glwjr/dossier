"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearToken, redirectToLogin } from "@/lib/auth";

export function Nav() {
  const pathname = usePathname();

  function handleLogout() {
    clearToken();
    redirectToLogin();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-foreground ${
        pathname === href ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Dossier
        </Link>
        <nav className="flex items-center gap-6">
          {link("/", "Dashboard")}
          {link("/programs", "Programs")}
          {link("/recommenders", "Recommenders")}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
