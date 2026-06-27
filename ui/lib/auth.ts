const TOKEN_KEY = "dossier_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function redirectToLogin(): void {
  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
}
