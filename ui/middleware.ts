import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("dossier_token")?.value;

  if (!token) {
    const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except the auth callback, Next.js internals, and static files.
  matcher: ["/((?!auth/|_next/static|_next/image|favicon.ico).*)"],
};
