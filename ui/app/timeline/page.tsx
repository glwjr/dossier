"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DeadlineWithProgram, RequirementWithProgram } from "@/lib/types";
import {
  DEADLINE_KIND_LABEL,
  REQUIREMENT_KIND_LABEL,
  daysUntil,
  formatDate,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { usePageTitle } from "@/lib/use-page-title";
import { useCollapsedSections } from "@/lib/use-collapsed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEADLINE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  application: "default",
  fellowship: "secondary",
  fee_waiver: "outline",
  interview: "secondary",
};

type TimelineItem =
  | { itemType: "deadline"; dueDate: string; isDone: boolean; programId: number; school: string; department: string; notes: string | null; raw: DeadlineWithProgram }
  | { itemType: "requirement"; dueDate: string; isDone: boolean; programId: number; school: string; department: string; notes: string | null; raw: RequirementWithProgram };

function TimelineInner() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [programFilter, setProgramFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [search, setSearch] = useState("");
  const {
    collapsed,
    toggle: toggleCollapsed,
    collapseAll,
    expandAll,
  } = useCollapsedSections("dossier_collapsed_timeline");

  const { data: deadlines = [], isLoading: dlLoading, error: dlError } = useQuery<DeadlineWithProgram[]>({
    queryKey: ["deadlines"],
    queryFn: () => api.get("/deadlines"),
  });

  const { data: requirements = [], isLoading: reqLoading, error: reqError } = useQuery<RequirementWithProgram[]>({
    queryKey: ["requirements-all"],
    queryFn: () => api.get("/requirements"),
  });

  const isLoading = dlLoading || reqLoading;

  const toggleDeadline = useMutation({
    mutationFn: (d: DeadlineWithProgram) =>
      api.patch(`/deadlines/${d.id}`, { done: !d.done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deadlines"] }),
  });

  const toggleRequirement = useMutation({
    mutationFn: (r: RequirementWithProgram) =>
      api.patch(`/requirements/${r.id}`, {
        status: r.status === "done" ? "todo" : "done",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
  });

  const items: TimelineItem[] = useMemo(() => {
    const dl: TimelineItem[] = deadlines.map((d) => ({
      itemType: "deadline",
      dueDate: d.due_date,
      isDone: d.done,
      programId: d.program.id,
      school: d.program.school,
      department: d.program.department,
      notes: d.notes,
      raw: d,
    }));

    const req: TimelineItem[] = requirements
      .filter((r) => r.due_date !== null)
      .map((r) => ({
        itemType: "requirement",
        dueDate: r.due_date as string,
        isDone: r.status === "done" || r.status === "waived",
        programId: r.program.id,
        school: r.program.school,
        department: r.program.department,
        notes: r.notes,
        raw: r,
      }));

    return [...dl, ...req].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [deadlines, requirements]);

  const programs = useMemo(() => {
    const seen = new Map<number, { id: number; school: string }>();
    for (const item of items) {
      if (!seen.has(item.programId))
        seen.set(item.programId, { id: item.programId, school: item.school });
    }
    return [...seen.values()].sort((a, b) => a.school.localeCompare(b.school));
  }, [items]);

  const q = search.toLowerCase();
  const visible = items
    .filter((item) => showAll || !item.isDone)
    .filter((item) => programFilter === "all" || item.programId === Number(programFilter))
    .filter((item) => kindFilter === "all" || item.itemType === kindFilter)
    .filter(
      (item) =>
        !q ||
        item.school.toLowerCase().includes(q) ||
        (item.itemType === "requirement" && item.raw.label.toLowerCase().includes(q))
    );

  const grouped = visible.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const [year, month] = item.dueDate.split("-");
    const key = `${year}-${month}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  function monthLabel(key: string) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  function toggleItem(item: TimelineItem) {
    if (item.itemType === "deadline") toggleDeadline.mutate(item.raw);
    else toggleRequirement.mutate(item.raw);
  }

  if (dlError || reqError)
    return <ErrorState title="Failed to load timeline" message="Something went wrong. Try refreshing the page." />;

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

  if (items.length === 0)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">Nothing on the timeline yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add deadlines or requirement due dates from a program&apos;s detail
          page.
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm sm:flex-1"
        />
        <div className="flex gap-2">
        <Select value={programFilter} onValueChange={(v) => v && setProgramFilter(v)}>
          <SelectTrigger className="h-9 flex-1 text-sm sm:w-44 sm:flex-none">
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
          <SelectTrigger className="h-9 flex-1 text-sm sm:w-36 sm:flex-none">
            <SelectValue>
              {kindFilter === "all"
                ? "All types"
                : kindFilter === "deadline"
                ? "Deadlines"
                : "Requirements"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="deadline">Deadlines</SelectItem>
            <SelectItem value="requirement">Requirements</SelectItem>
          </SelectContent>
        </Select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {items.filter((d) => !d.isDone).length} upcoming ·{" "}
            {items.filter((d) => d.isDone).length} done
          </p>
          <Button variant="outline" className="h-8" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Hide done" : "Show all"}
          </Button>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing matches the current filters.
        </p>
      )}

      {visible.length > 0 && (
        <div className="flex justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => collapseAll(Object.keys(grouped))}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([key, groupItems]) => {
        const isCollapsed = collapsed.has(key);
        return (
        <div key={key} className="space-y-2">
          <button
            type="button"
            onClick={() => toggleCollapsed(key)}
            aria-expanded={!isCollapsed}
            className="flex w-full items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
            />
            {monthLabel(key)}
            <span className="ml-auto normal-case tracking-normal">
              {groupItems.length}
            </span>
          </button>
          {!isCollapsed && (
          <div className="space-y-2">
            {groupItems.map((item) => {
              const days = daysUntil(item.dueDate);
              const overdue = days < 0 && !item.isDone;
              const key =
                item.itemType === "deadline"
                  ? `dl-${item.raw.id}`
                  : `req-${item.raw.id}`;
              return (
                <div
                  key={key}
                  className={`flex items-start gap-4 rounded-md border px-4 py-3 text-sm transition-opacity ${
                    item.isDone ? "opacity-50" : ""
                  } ${
                    !item.isDone && days < 0
                      ? "border-l-4 border-l-destructive"
                      : !item.isDone && days <= 7
                      ? "border-l-4 border-l-yellow-500"
                      : ""
                  }`}
                >
                  <Checkbox
                    checked={item.isDone}
                    onCheckedChange={() => toggleItem(item)}
                    className="cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={
                        item.itemType === "deadline"
                          ? `/programs/${item.programId}?tab=deadlines`
                          : `/programs/${item.programId}?tab=requirements`
                      }
                      className="block truncate font-medium hover:underline"
                    >
                      {item.school}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {item.itemType === "deadline"
                        ? `${DEADLINE_KIND_LABEL[item.raw.kind]} deadline`
                        : item.raw.label}
                    </p>
                    {item.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mb-2">
                      {item.itemType === "deadline" ? (
                        <Badge variant={DEADLINE_BADGE_VARIANT[item.raw.kind]}>
                          {DEADLINE_KIND_LABEL[item.raw.kind]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {REQUIREMENT_KIND_LABEL[item.raw.kind]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs">
                      <span className={overdue ? "font-medium text-destructive" : ""}>
                        {formatDate(item.dueDate)}
                      </span>
                      {!item.isDone && (
                        <span
                          className={
                            overdue
                              ? "text-destructive"
                              : days <= 14
                              ? "text-yellow-600"
                              : "text-muted-foreground"
                          }
                        >
                          {overdue
                            ? ` · ${Math.abs(days)}d overdue`
                            : days === 0
                            ? " · Today"
                            : ` · ${days}d`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
        );
      })}
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
