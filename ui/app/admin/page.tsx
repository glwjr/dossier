"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/lib/use-page-title";

interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

interface WeeklySignup {
  week: string;
  count: number;
}

interface AdminStats {
  total_users: number;
  signups_this_week: number;
  weekly_signups: WeeklySignup[];
  users: AdminUserRow[];
}

function AdminInner() {
  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats"),
    retry: false,
  });

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-20 w-36" />
          <Skeleton className="h-20 w-36" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  if (error)
    return (
      <ErrorState
        title="Access denied"
        message="This page is restricted to the site admin."
        backHref="/"
        backLabel="Back to dashboard"
      />
    );

  const maxCount = Math.max(...data!.weekly_signups.map((w) => w.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <div className="rounded-lg border px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total users</p>
          <p className="mt-1 text-3xl font-semibold">{data!.total_users}</p>
        </div>
        <div className="rounded-lg border px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">This week</p>
          <p className="mt-1 text-3xl font-semibold">{data!.signups_this_week}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Signups — last 12 weeks</h2>
        <div className="rounded-lg border px-4 py-4">
          <div className="flex h-24 items-end gap-1.5">
            {data!.weekly_signups.map((w) => (
              <div key={w.week} className="group flex flex-1 flex-col items-center gap-1">
                <span className="hidden text-xs text-muted-foreground group-hover:block">
                  {w.count}
                </span>
                <div
                  className="w-full rounded-sm bg-foreground/80 transition-all"
                  style={{ height: `${(w.count / maxCount) * 100}%`, minHeight: w.count > 0 ? "3px" : "0" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {data!.weekly_signups.map((w) => (
              <div key={w.week} className="flex-1 text-center text-xs text-muted-foreground truncate">
                {w.week.slice(5)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">All users ({data!.total_users})</h2>
        <div className="rounded-lg border divide-y">
          {data!.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(u.created_at.slice(0, 10))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  usePageTitle("Admin");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>
      <AdminInner />
    </RequireAuth>
  );
}
