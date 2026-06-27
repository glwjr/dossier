"use client";

import { useEffect, useState } from "react";
import { getToken, redirectToLogin } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      redirectToLogin();
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
