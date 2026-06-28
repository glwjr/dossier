"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/lib/types";
import { clearToken, redirectToHome } from "@/lib/auth";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { formatDate } from "@/lib/display";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/use-page-title";

function AccountInner() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/me"),
  });

  function handleSignOut() {
    clearToken();
    redirectToHome();
  }

  if (isLoading)
    return (
      <div className="max-w-sm space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-9 w-24" />
      </div>
    );
  if (error) return <ErrorState title="Failed to load account" message="Something went wrong. Try refreshing the page." />;
  if (!user) return null;

  return (
    <div className="max-w-sm space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
          <p className="mt-0.5 text-sm font-medium">{user.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="mt-0.5 text-sm font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Member since</p>
          <p className="mt-0.5 text-sm font-medium">
            {formatDate(user.created_at.slice(0, 10))}
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}

export default function AccountPage() {
  usePageTitle("Account");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Account</h1>
      <AccountInner />
    </RequireAuth>
  );
}
