"use client";

import { Button } from "@/components/ui/button";
import { startDemo, startGoogleLogin } from "@/lib/auth";
import { usePageTitle } from "@/lib/use-page-title";

export default function LoginPage() {
  usePageTitle("Sign in");

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-8 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dossier</h1>
        <p className="text-sm text-muted-foreground">
          Track your PhD applications — programs, deadlines, requirements,
          recommenders, and more.
        </p>
      </div>

      <div className="w-full space-y-3">
        <Button className="w-full" onClick={startGoogleLogin}>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full" onClick={startDemo}>
          Try the demo — no sign-up
        </Button>
        <p className="text-xs text-muted-foreground">
          The demo gives you a private, fully editable sample account. It’s
          temporary and cleared automatically.
        </p>
      </div>
    </div>
  );
}
