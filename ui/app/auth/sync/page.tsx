"use client";

import { useEffect } from "react";
import { getToken, setToken, redirectToLogin } from "@/lib/auth";

// Middleware redirects here when no dossier_token cookie is present.
// If a token exists in localStorage (pre-cookie sessions), sync it to a
// cookie and redirect home. Otherwise send the user to the API login.
export default function AuthSync() {
  useEffect(() => {
    const token = getToken();
    if (token) {
      setToken(token); // writes cookie alongside existing localStorage entry
      window.location.replace("/");
    } else {
      redirectToLogin();
    }
  }, []);

  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}
