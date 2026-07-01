"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/display";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardEntry,
  DeadlineWithProgram,
  ProgramStatus,
  RequirementWithProgram,
} from "@/lib/types";
import {
  DEADLINE_KIND_LABEL,
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { usePageTitle } from "@/lib/use-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTIVE_STATUSES: ProgramStatus[] = ["researching", "drafting", "submitted", "interview"];
const DECIDED_STATUSES: ProgramStatus[] = ["accepted", "waitlisted", "rejected"];
// Programs whose fee likely hasn't been paid yet (still working on the app).
const UNSUBMITTED_STATUSES: ProgramStatus[] = ["researching", "drafting"];

type DashboardFilter = "all" | "active" | "decided";

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function ProgramCard({ entry }: { entry: DashboardEntry }) {
  const { program, completion_pct, next_deadline, days_remaining, blocking_requirements } =
    entry;

  return (
    <Link href={`/programs/${program.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{program.school}</CardTitle>
              <p className="text-sm text-muted-foreground">{program.department}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Badge variant={PROGRAM_TIER_VARIANT[program.tier]}>
                {PROGRAM_TIER_LABEL[program.tier]}
              </Badge>
              <Badge variant="outline">{PROGRAM_STATUS_LABEL[program.status]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className={`font-medium ${completion_pct === 100 ? "text-green-600 dark:text-green-500" : ""}`}>
                {completion_pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${completion_pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next deadline</span>
            <span className={
              days_remaining === null ? "text-muted-foreground" :
              days_remaining <= 3 ? "font-medium text-destructive" :
              days_remaining <= 14 ? "text-yellow-600" :
              "text-muted-foreground"
            }>
              {next_deadline ? `${formatDate(next_deadline)} (${days_remaining}d)` : "—"}
            </span>
          </div>

          <div className="flex items-start gap-8 text-sm">
            <span className="shrink-0 text-muted-foreground">Blocking</span>
            {blocking_requirements.length === 0 ? (
              <span className="flex-1 text-right text-muted-foreground">All clear</span>
            ) : (
              <span className="flex-1 text-right text-destructive">
                {blocking_requirements.slice(0, 2).map((r) => r.label).join(", ")}
                {blocking_requirements.length > 2 && ` +${blocking_requirements.length - 2} more`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const [filter, setFilter] = useState<DashboardFilter>("all");

  const { data, isLoading, error } = useQuery<DashboardEntry[]>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard"),
  });
  const { data: allDeadlines = [] } = useQuery<DeadlineWithProgram[]>({
    queryKey: ["deadlines-all"],
    queryFn: () => api.get("/deadlines"),
  });
  const { data: allRequirements = [] } = useQuery<RequirementWithProgram[]>({
    queryKey: ["requirements-all"],
    queryFn: () => api.get("/requirements"),
  });

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    );
  if (error) return <ErrorState title="Failed to load dashboard" message="Something went wrong. Try refreshing the page." />;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">Welcome to Dossier</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every school, deadline, and letter of recommendation in one place.
        </p>
        <Link href="/programs" className="mt-4 inline-block text-sm underline underline-offset-4">
          Add your first program →
        </Link>
      </div>
    );

  const visible = data.filter((e) => {
    if (filter === "active") return ACTIVE_STATUSES.includes(e.program.status);
    if (filter === "decided") return DECIDED_STATUSES.includes(e.program.status);
    return true;
  });

  const totalPrograms = visible.length;
  const upcomingDeadlines = visible.filter(
    (e) => e.next_deadline !== null && e.days_remaining !== null && e.days_remaining <= 30
  ).length;
  const blockingCount = visible.reduce((sum, e) => sum + e.blocking_requirements.length, 0);
  const totalFees = visible.reduce((sum, e) => sum + (e.program.app_fee ?? 0), 0);
  const remainingFees = visible.reduce(
    (sum, e) =>
      UNSUBMITTED_STATUSES.includes(e.program.status)
        ? sum + (e.program.app_fee ?? 0)
        : sum,
    0
  );
  const acceptedCount = visible.filter((e) => e.program.status === "accepted").length;
  const waitlistedCount = visible.filter((e) => e.program.status === "waitlisted").length;
  const rejectedCount = visible.filter((e) => e.program.status === "rejected").length;

  const sorted = [...visible].sort((a, b) => {
    if (a.days_remaining === null) return 1;
    if (b.days_remaining === null) return -1;
    return a.days_remaining - b.days_remaining;
  });

  // Everything due in the next 14 days across programs: deadlines + dated,
  // still-open requirements. Only for programs visible under the current filter.
  const visibleIds = new Set(visible.map((e) => e.program.id));
  const dueSoon = [
    ...allDeadlines
      .filter((d) => !d.done && visibleIds.has(d.program_id))
      .map((d) => ({
        key: `d${d.id}`,
        programId: d.program_id,
        school: d.program.school,
        label: `${DEADLINE_KIND_LABEL[d.kind]} deadline`,
        date: d.due_date,
        tab: "deadlines",
      })),
    ...allRequirements
      .filter(
        (r) =>
          r.due_date &&
          r.status !== "done" &&
          r.status !== "waived" &&
          visibleIds.has(r.program_id)
      )
      .map((r) => ({
        key: `r${r.id}`,
        programId: r.program_id,
        school: r.program.school,
        label: r.label,
        date: r.due_date as string,
        tab: "requirements",
      })),
  ]
    .map((i) => ({ ...i, days: daysUntil(i.date) }))
    .filter((i) => i.days >= 0 && i.days <= 14)
    .sort((a, b) => a.days - b.days);

  const FILTERS: { value: DashboardFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "decided", label: "Decided" },
  ];

  return (
    <div className="space-y-6">
      {/* Desktop: stats + filter in one row */}
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="grid flex-1 grid-cols-4 gap-2">
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium">{totalPrograms}</span>
            <span className="ml-1 text-muted-foreground">
              {totalPrograms === 1 ? "program" : "programs"}
            </span>
          </div>
          {filter === "decided" ? (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className="font-medium text-green-600 dark:text-green-500">{acceptedCount}</span>
              <span className="ml-1 text-muted-foreground">accepted</span>
            </div>
          ) : (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className="font-medium">
                {totalFees > 0 ? `$${totalFees.toLocaleString()}` : "—"}
              </span>
              <span className="ml-1 text-muted-foreground">
              in fees{remainingFees > 0 && ` · $${remainingFees.toLocaleString()} left`}
            </span>
            </div>
          )}
          {filter === "decided" ? (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className="font-medium">{waitlistedCount}</span>
              <span className="ml-1 text-muted-foreground">waitlisted</span>
            </div>
          ) : (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className={`font-medium ${upcomingDeadlines > 0 ? "text-destructive" : ""}`}>
                {upcomingDeadlines}
              </span>
              <span className="ml-1 text-muted-foreground">
                {upcomingDeadlines === 1 ? "deadline" : "deadlines"} this month
              </span>
            </div>
          )}
          {filter === "decided" ? (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className="font-medium text-muted-foreground">{rejectedCount}</span>
              <span className="ml-1 text-muted-foreground">rejected</span>
            </div>
          ) : (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className={`font-medium ${blockingCount > 0 ? "text-destructive" : "text-green-600 dark:text-green-500"}`}>
                {blockingCount}
              </span>
              <span className="ml-1 text-muted-foreground">
                {blockingCount === 1 ? "requirement" : "requirements"} blocking
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center rounded-md border text-sm">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Mobile: 2x2 stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <div className="rounded-md border px-3 py-1.5 text-sm">
          <span className="font-medium">{totalPrograms}</span>
          <span className="ml-1 text-muted-foreground">
            {totalPrograms === 1 ? "program" : "programs"}
          </span>
        </div>
        {filter === "decided" ? (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium text-green-600 dark:text-green-500">{acceptedCount}</span>
            <span className="ml-1 text-muted-foreground">accepted</span>
          </div>
        ) : (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium">
              {totalFees > 0 ? `$${totalFees.toLocaleString()}` : "—"}
            </span>
            <span className="ml-1 text-muted-foreground">
              in fees{remainingFees > 0 && ` · $${remainingFees.toLocaleString()} left`}
            </span>
          </div>
        )}
        {filter === "decided" ? (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium">{waitlistedCount}</span>
            <span className="ml-1 text-muted-foreground">waitlisted</span>
          </div>
        ) : (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className={`font-medium ${upcomingDeadlines > 0 ? "text-destructive" : ""}`}>
              {upcomingDeadlines}
            </span>
            <span className="ml-1 text-muted-foreground">
              {upcomingDeadlines === 1 ? "deadline" : "deadlines"} this month
            </span>
          </div>
        )}
        {filter === "decided" ? (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{rejectedCount}</span>
            <span className="ml-1 text-muted-foreground">rejected</span>
          </div>
        ) : (
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className={`font-medium ${blockingCount > 0 ? "text-destructive" : "text-green-600 dark:text-green-500"}`}>
              {blockingCount}
            </span>
            <span className="ml-1 text-muted-foreground">
              {blockingCount === 1 ? "requirement" : "requirements"} blocking
            </span>
          </div>
        )}
      </div>
      {/* Mobile: sticky filter strip — must be a direct sibling, not inside a flex container */}
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2 sm:hidden">
        <div className="flex w-full items-center rounded-md border text-sm">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-1 py-1.5 text-center transition-colors first:rounded-l-md last:rounded-r-md ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {dueSoon.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Next 14 days</h2>
          {dueSoon.map((i) => (
            <Link
              key={i.key}
              href={`/programs/${i.programId}?tab=${i.tab}`}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{i.school}</span>
                <span className="text-muted-foreground"> · {i.label}</span>
              </span>
              <span className={`shrink-0 text-xs ${i.days <= 3 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {formatDate(i.date)} · {i.days === 0 ? "Today" : `${i.days}d`}
              </span>
            </Link>
          ))}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No programs match the current filter.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((entry) => (
            <ProgramCard key={entry.program.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <Dashboard />
    </RequireAuth>
  );
}
