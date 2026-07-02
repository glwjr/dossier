"use client";

/**
 * Auth boundary for app pages. The real gate is the Next.js middleware
 * (ui/proxy.ts), which redirects anyone without the auth cookie before the page
 * renders; an invalid or expired cookie is caught by the 401 handler on the
 * first API call (see providers.tsx). Because the token is HttpOnly, there is
 * nothing for the client to check here — this stays as the pages' wrapper.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
