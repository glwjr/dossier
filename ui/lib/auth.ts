const TOKEN_KEY = "dossier_token";

// Marketing site (dossiertool.com) — the landing/login page with the Google
// and demo CTAs. Unauthenticated app visitors are sent here.
const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://dossiertool.com";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  // Mirror to a cookie so Next.js middleware can read it server-side.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax${secure}`;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function redirectToLogin(): void {
  window.location.href = MARKETING_URL;
}

export function redirectToHome(): void {
  window.location.href = MARKETING_URL;
}
