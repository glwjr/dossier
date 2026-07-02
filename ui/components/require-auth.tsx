"use client";

import { useEffect, useState } from "react";
import { getToken, redirectToLogin } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      redirectToLogin();
    } else {
      // Client-only auth gate; the token isn't available during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
    }
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
