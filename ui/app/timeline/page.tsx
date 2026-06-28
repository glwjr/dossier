"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DeadlineWithProgram } from "@/lib/types";
import { DEADLINE_KIND_LABEL, formatDate } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const KIND_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  application: "default",
  fellowship: "secondary",
  fee_waiver: "outline",
};

function TimelineInner() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

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

  const visible = showAll ? data : data.filter((d) => !d.done);

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
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    return diff;
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  if (data.length === 0)
    return (
      <p className="text-muted-foreground">
        No deadlines yet.{" "}
        <Link href="/programs" className="underline">
          Add one from a program
        </Link>
        .
      </p>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.filter((d) => !d.done).length} upcoming ·{" "}
          {data.filter((d) => d.done).length} done
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Hide done" : "Show all"}
        </Button>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          All deadlines are done.{" "}
          <button
            className="underline"
            onClick={() => setShowAll(true)}
          >
            Show anyway
          </button>
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
                  <input
                    type="checkbox"
                    checked={d.done}
                    onChange={() => toggleDone.mutate(d)}
                    className="h-4 w-4 cursor-pointer accent-primary"
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
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? "today"
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
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Timeline</h1>
      <TimelineInner />
    </RequireAuth>
  );
}
