"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/display";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardEntry, ProgramStatus } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { usePageTitle } from "@/lib/use-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTIVE_STATUSES: ProgramStatus[] = ["researching", "drafting", "submitted", "interview"];
const DECIDED_STATUSES: ProgramStatus[] = ["accepted", "waitlisted", "rejected"];

type DashboardFilter = "all" | "active" | "decided";

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
              <span className="font-medium">{completion_pct}%</span>
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
            <span>
              {next_deadline ? `${formatDate(next_deadline)} (${days_remaining}d)` : "—"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">Blocking</span>
            {blocking_requirements.length === 0 ? (
              <span className="text-green-600 dark:text-green-500">All clear</span>
            ) : (
              <span className="text-right text-destructive">
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
  if (error) return <p className="text-destructive">Failed to load dashboard.</p>;
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

  const sorted = [...visible].sort((a, b) => {
    if (a.days_remaining === null) return 1;
    if (b.days_remaining === null) return -1;
    return a.days_remaining - b.days_remaining;
  });

  const upcomingList = visible
    .filter((e) => e.next_deadline !== null && e.days_remaining !== null && e.days_remaining >= 0 && e.days_remaining <= 14)
    .sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999));

  const FILTERS: { value: DashboardFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "decided", label: "Decided" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className="font-medium">{totalPrograms}</span>
            <span className="ml-1 text-muted-foreground">
              {totalPrograms === 1 ? "program" : "programs"}
            </span>
          </div>
          {totalFees > 0 && (
            <div className="rounded-md border px-3 py-1.5 text-sm">
              <span className="font-medium">${totalFees.toLocaleString()}</span>
              <span className="ml-1 text-muted-foreground">in fees</span>
            </div>
          )}
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className={`font-medium ${upcomingDeadlines > 0 ? "text-destructive" : ""}`}>
              {upcomingDeadlines}
            </span>
            <span className="ml-1 text-muted-foreground">
              {upcomingDeadlines === 1 ? "deadline" : "deadlines"} this month
            </span>
          </div>
          <div className="rounded-md border px-3 py-1.5 text-sm">
            <span className={`font-medium ${blockingCount > 0 ? "text-destructive" : "text-green-600 dark:text-green-500"}`}>
              {blockingCount}
            </span>
            <span className="ml-1 text-muted-foreground">
              {blockingCount === 1 ? "requirement" : "requirements"} blocking
            </span>
          </div>
        </div>
        <div className="flex items-center rounded-md border text-sm">
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
      {upcomingList.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Next 14 days</h2>
          {upcomingList.map((e) => (
            <div
              key={e.program.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <Link href={`/programs/${e.program.id}?tab=deadlines`} className="font-medium hover:underline">
                {e.program.school}
              </Link>
              <span className={`text-xs ${(e.days_remaining ?? 99) <= 3 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {formatDate(e.next_deadline!)} · {e.days_remaining === 0 ? "Today" : `${e.days_remaining}d`}
              </span>
            </div>
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
