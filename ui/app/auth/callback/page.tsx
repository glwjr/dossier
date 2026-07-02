"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The token arrives in the URL fragment (#token=…), which the browser never
    // sends to a server (so it stays out of access logs and the Referer header).
    // Parse it client-side, then replace the history entry so the raw token
    // isn't left sitting in the address bar or browser history.
    const hash = window.location.hash.replace(/^#/, "");
    const token = new URLSearchParams(hash).get("token");
    if (token) {
      setToken(token);
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Signing you in…
    </div>
  );
}
