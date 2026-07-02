// The JWT lives only in an HttpOnly cookie set by the API, so there is no token
// for client JS to read, store, or clear. Session checks are done server-side
// (the Next.js middleware in proxy.ts) and sign-out goes through the API, which
// is the only party that can clear the cookie.

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://dossiertool.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function redirectToLogin(): void {
  window.location.href = MARKETING_URL;
}

export function redirectToHome(): void {
  window.location.href = MARKETING_URL;
}

/** Sign out of this browser: clear the HttpOnly cookie server-side, then leave. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best effort — redirect regardless so the user still lands on the login page.
  }
  redirectToHome();
}
