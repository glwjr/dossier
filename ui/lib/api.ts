const BASE = process.env.NEXT_PUBLIC_API_URL!;

export class AuthError extends Error {
  constructor() {
    super("Session expired");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // credentials: "include" sends the HttpOnly auth cookie on this cross-origin
  // (same-site) request; no token is read or attached by JS.
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw new AuthError();
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
