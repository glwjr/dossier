import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("dossier_token")?.value;

  if (!token) {
    // Send to /auth/sync first — it checks localStorage and sets the cookie
    // if a token already exists (e.g. from a previous session before cookies
    // were introduced), then redirects to / or to the API login.
    const syncUrl = new URL("/auth/sync", request.url);
    return NextResponse.redirect(syncUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except the auth callback, Next.js internals, and static files.
  matcher: ["/((?!auth/|_next/static|_next/image|favicon.ico).*)"],
};
