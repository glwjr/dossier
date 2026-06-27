"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { DashboardEntry } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
              {next_deadline ? `${next_deadline} (${days_remaining}d)` : "—"}
            </span>
          </div>

          {blocking_requirements.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Blocking: </span>
              {blocking_requirements.map((r) => r.label).join(", ")}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardEntry[]>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">Failed to load dashboard.</p>;
  if (!data?.length)
    return (
      <p className="text-muted-foreground">
        No programs yet.{" "}
        <Link href="/programs" className="underline">
          Add one
        </Link>
        .
      </p>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((entry) => (
        <ProgramCard key={entry.program.id} entry={entry} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <Dashboard />
    </RequireAuth>
  );
}
