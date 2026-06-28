"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DeadlineWithProgram } from "@/lib/types";
import { DEADLINE_KIND_LABEL, formatDate } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { usePageTitle } from "@/lib/use-page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KIND_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  application: "default",
  fellowship: "secondary",
  fee_waiver: "outline",
};

function TimelineInner() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [programFilter, setProgramFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const { data = [], isLoading } = useQuery<DeadlineWithProgram[]>({
    queryKey: ["deadlines"],
    queryFn: () => api.get("/deadlines"),
  });

  const toggleDone = useMutation({
    mutationFn: (d: DeadlineWithProgram) =>
      api.patch(`/deadlines/${d.id}`, { done: !d.done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deadlines"] }),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const programs = useMemo(() => {
    const seen = new Map<number, { id: number; school: string }>();
    for (const d of data) {
      if (!seen.has(d.program.id)) seen.set(d.program.id, d.program);
    }
    return [...seen.values()].sort((a, b) => a.school.localeCompare(b.school));
  }, [data]);

  const visible = data
    .filter((d) => showAll || !d.done)
    .filter((d) => programFilter === "all" || d.program.id === Number(programFilter))
    .filter((d) => kindFilter === "all" || d.kind === kindFilter);

  const grouped = visible.reduce<Record<string, DeadlineWithProgram[]>>(
    (acc, d) => {
      const [year, month] = d.due_date.split("-");
      const key = `${year}-${month}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    },
    {}
  );

  function monthLabel(key: string) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  function daysRemaining(dueDateStr: string) {
    const [y, m, d] = dueDateStr.split("-").map(Number);
    const due = new Date(y, m - 1, d);
    return Math.ceil((due.getTime() - today.getTime()) / 86400000);
  }

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );

  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No deadlines yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add deadlines from a program's detail page and they'll appear here.
        </p>
        <Link
          href="/programs"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Go to programs →
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={programFilter} onValueChange={(v) => v && setProgramFilter(v)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue>
              {programFilter === "all"
                ? "All programs"
                : programs.find((p) => String(p.id) === programFilter)?.school ?? "All programs"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.school}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={kindFilter} onValueChange={(v) => v && setKindFilter(v)}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue>
              {kindFilter === "all" ? "All types" : DEADLINE_KIND_LABEL[kindFilter as keyof typeof DEADLINE_KIND_LABEL]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="application">Application</SelectItem>
            <SelectItem value="fellowship">Fellowship</SelectItem>
            <SelectItem value="fee_waiver">Fee waiver</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {data.filter((d) => !d.done).length} upcoming ·{" "}
            {data.filter((d) => d.done).length} done
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Hide done" : "Show all"}
          </Button>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing matches the current filters.
        </p>
      )}

      {Object.entries(grouped).map(([key, items]) => (
        <div key={key} className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {monthLabel(key)}
          </h2>
          <div className="space-y-2">
            {items.map((d) => {
              const days = daysRemaining(d.due_date);
              const overdue = days < 0 && !d.done;
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-opacity ${
                    d.done ? "opacity-50" : ""
                  }`}
                >
                  <Checkbox
                    checked={d.done}
                    onCheckedChange={() => toggleDone.mutate(d)}
                    className="cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/programs/${d.program.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.program.school}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.program.department}
                    </p>
                    {d.notes && (
                      <p className="text-xs text-muted-foreground truncate">
                        {d.notes}
                      </p>
                    )}
                  </div>
                  <Badge variant={KIND_VARIANT[d.kind]}>
                    {DEADLINE_KIND_LABEL[d.kind]}
                  </Badge>
                  <div className="text-right shrink-0">
                    <p className={overdue ? "text-destructive font-medium" : ""}>
                      {formatDate(d.due_date)}
                    </p>
                    {!d.done && (
                      <p
                        className={`text-xs ${
                          overdue
                            ? "text-destructive"
                            : days <= 14
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {overdue
                          ? `${Math.abs(days)}d Overdue`
                          : days === 0
                          ? "Today"
                          : `${days}d`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TimelinePage() {
  usePageTitle("Timeline");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Timeline</h1>
      <TimelineInner />
    </RequireAuth>
  );
}
