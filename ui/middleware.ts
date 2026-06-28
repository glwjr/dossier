import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.dossiertool.com";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("dossier_token")?.value;
  if (!token) {
    return NextResponse.redirect(`${API_URL}/auth/login`);
  }
  return NextResponse.next();
}

export const config = {
  // Run on all routes except auth callbacks, Next.js internals, and static files.
  matcher: ["/((?!auth/|_next/static|_next/image|favicon.ico).*)"],
};
