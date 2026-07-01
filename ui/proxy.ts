import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("dossier_token")?.value;
  if (!token) {
    // In-app landing page (offers Google sign-in and the no-signup demo).
    // Exempt from this matcher via the `auth/` exclusion below, so no loop.
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Run on all routes except auth callbacks, Next.js internals, and static files.
  matcher: ["/((?!auth/|_next/static|_next/image|favicon.ico).*)"],
};
