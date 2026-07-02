"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/lib/types";
import { logout, redirectToHome } from "@/lib/auth";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { formatDate } from "@/lib/display";
import { onMutationError } from "@/lib/mutation-error";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/lib/use-page-title";

function AccountInner() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/me"),
  });

  const generateToken = useMutation({
    mutationFn: () => api.post<User>("/me/calendar-token", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    onError: onMutationError,
  });
  const revokeToken = useMutation({
    mutationFn: () => api.delete("/me/calendar-token"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Calendar link disabled");
    },
    onError: onMutationError,
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete("/me"),
    // The API clears the auth cookie as part of deletion; just leave.
    onSuccess: () => redirectToHome(),
    onError: onMutationError,
  });

  function handleSignOut() {
    // logout() clears the HttpOnly cookie server-side, then redirects.
    logout();
  }

  const signOutEverywhere = useMutation({
    mutationFn: () => api.post("/me/logout-all", {}),
    // logout-all bumps token_version and clears this browser's cookie.
    onSuccess: () => redirectToHome(),
    onError: onMutationError,
  });

  const feedUrl = user?.calendar_token
    ? `${process.env.NEXT_PUBLIC_API_URL}/calendar/${user.calendar_token}.ics`
    : "";
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  function copyFeed() {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleExport() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/export`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const isDemo = user.is_demo;

  return (
    <div className="max-w-sm space-y-6">
      {isDemo && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          You’re exploring a demo account. Your data is temporary and resets
          automatically — sign in with Google to start your own.
        </div>
      )}
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
      {!isDemo && (
      <div className="space-y-2 border-t pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Calendar subscription
        </p>
        {user.calendar_token ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Subscribe in Google/Apple Calendar to get your deadlines and dated
              requirements as events. Keep this link private.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={feedUrl} className="text-xs" />
              <Button variant="outline" onClick={copyFeed}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={webcalUrl} className={buttonVariants({ variant: "outline" })}>
                Subscribe
              </a>
              <Button
                variant="outline"
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
              >
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={() => revokeToken.mutate()}
                disabled={revokeToken.isPending}
              >
                Disable
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Generate a private link to subscribe to your deadlines from any
              calendar app.
            </p>
            <Button
              variant="outline"
              onClick={() => generateToken.mutate()}
              disabled={generateToken.isPending}
            >
              {generateToken.isPending ? "Generating…" : "Generate calendar link"}
            </Button>
          </div>
        )}
      </div>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button variant="outline" onClick={handleExport}>
          Export my data
        </Button>
        <Button variant="outline" onClick={handleSignOut}>
          {isDemo ? "Exit demo" : "Sign out"}
        </Button>
        {!isDemo && (
          <Button
            variant="outline"
            onClick={() => signOutEverywhere.mutate()}
            disabled={signOutEverywhere.isPending}
          >
            {signOutEverywhere.isPending ? "Signing out…" : "Sign out everywhere"}
          </Button>
        )}
      </div>

      {!isDemo && (
      <div className="space-y-2 border-t pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Danger zone
        </p>
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This permanently deletes your account and everything in it —
              programs, requirements, deadlines, recommenders, advisors, and
              documents. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending ? "Deleting…" : "Delete everything"}
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        )}
      </div>
      )}

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
