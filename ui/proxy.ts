import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://dossiertool.com";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("dossier_token")?.value;
  if (!token) {
    // No in-app login page: bounce to the marketing site, which hosts the
    // Google sign-in and no-signup demo CTAs.
    return NextResponse.redirect(MARKETING_URL);
  }
  return NextResponse.next();
}

export const config = {
  // Run on all routes except auth callbacks, Next.js internals, and static files.
  matcher: ["/((?!auth/|_next/static|_next/image|favicon.ico).*)"],
};
