"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
    }
    router.replace("/");
  }, [params, router]);

  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Signing you in…
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Signing you in…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
