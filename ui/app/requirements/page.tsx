"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { RequirementWithProgram } from "@/lib/types";
import {
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_KIND_LABEL,
  formatDate,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import { usePageTitle } from "@/lib/use-page-title";
import { useCollapsedSections } from "@/lib/use-collapsed";

const STATUS_BORDER: Record<string, string> = {
  todo: "",
  in_progress: "border-l-yellow-500",
  done: "border-l-green-500",
  waived: "",
};

function RequirementsList({
  statusFilter,
  search,
  sort,
}: {
  statusFilter: string;
  search: string;
  sort: string;
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const {
    collapsed,
    toggle: toggleCollapsed,
    collapseAll,
    expandAll,
  } = useCollapsedSections("dossier_collapsed_requirements");

  const { data, isLoading, error } = useQuery<RequirementWithProgram[]>({
    queryKey: ["requirements-all"],
    queryFn: () => api.get("/requirements"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/requirements/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      toast.success("Status updated");
    },
    onError: onMutationError,
  });

  const updateNotes = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      api.patch(`/requirements/${id}`, { notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
    onError: onMutationError,
  });

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      await Promise.all(ids.map((id) => api.patch(`/requirements/${id}`, { status })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      setSelectedIds(new Set());
      toast.success("Updated");
    },
    onError: onMutationError,
  });

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function startEdit(r: RequirementWithProgram) {
    setEditingId(r.id);
    setEditingValue(r.notes ?? "");
  }

  function saveEdit(id: number) {
    updateNotes.mutate({ id, notes: editingValue });
    setEditingId(null);
  }

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (error) return <ErrorState title="Failed to load requirements" message="Something went wrong. Try refreshing the page." />;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No requirements yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add requirements from each program&apos;s detail page.
        </p>
        <Link href="/programs" className="mt-4 inline-block text-sm underline underline-offset-4">
          Go to programs →
        </Link>
      </div>
    );

  const q = search.toLowerCase();
  const filtered = data
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter(
      (r) =>
        !q ||
        r.program.school.toLowerCase().includes(q) ||
        r.program.department.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q)
    );

  if (filtered.length === 0)
    return <p className="text-sm text-muted-foreground">No requirements match the current filter.</p>;

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  // Top bar: always visible, left-aligned to match row checkboxes
  const selectionBar = (
    <div className="flex items-center gap-2 px-3 py-1">
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) =>
          setSelectedIds(checked ? new Set(filtered.map((r) => r.id)) : new Set())
        }
        aria-label="Select all"
      />
      {selectedIds.size > 0 ? (
        <>
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          <Select
            defaultValue=""
            onValueChange={(v) => v && bulkUpdate.mutate({ ids: [...selectedIds], status: v })}
            disabled={bulkUpdate.isPending}
          >
            <SelectTrigger className="h-6 w-28 text-xs">
              <SelectValue>Set status</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
        </>
      ) : (
        <span className="text-xs text-muted-foreground/50">Select all</span>
      )}
    </div>
  );

  function renderRow(r: RequirementWithProgram, showProgram: boolean) {
    return (
      <div
        key={r.id}
        className={`group flex items-start gap-3 rounded-md border border-l-4 px-3 py-2 text-sm ${STATUS_BORDER[r.status]}`}
      >
        <Checkbox
          checked={selectedIds.has(r.id)}
          onCheckedChange={() => toggleSelect(r.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          {showProgram && (
            <Link
              href={`/programs/${r.program.id}?tab=requirements`}
              className="mb-1 block truncate text-xs text-muted-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {r.program.school} · {r.program.department}
            </Link>
          )}
          <span className={`block truncate${r.status === "waived" ? " line-through text-muted-foreground" : ""}`}>{r.label}</span>
          <div className="mt-1">
            {editingId === r.id ? (
              <textarea
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => saveEdit(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingId(null);
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit(r.id);
                  }
                }}
                className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={2}
              />
            ) : (
              <p
                className={`cursor-pointer text-xs ${
                  r.notes
                    ? "text-muted-foreground hover:opacity-70"
                    : "text-muted-foreground/0 group-hover:text-muted-foreground/40"
                }`}
                onClick={() => startEdit(r)}
              >
                {r.notes || "Add note…"}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-muted-foreground">
            {REQUIREMENT_KIND_LABEL[r.kind]}
            {r.due_date && (
              <span className="hidden sm:inline"> · {formatDate(r.due_date)}</span>
            )}
          </span>
          <Select
            value={r.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: r.id, status: v })}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue>{REQUIREMENT_STATUS_LABEL[r.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (sort === "due_date") {
    const sorted = [...filtered].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
    return (
      <div className="space-y-2">
        {selectionBar}
        {sorted.map((r) => renderRow(r, true))}
      </div>
    );
  }

  // Default: grouped by program
  const byProgram = filtered.reduce<
    Record<number, { school: string; department: string; items: RequirementWithProgram[] }>
  >((acc, r) => {
    if (!acc[r.program.id]) {
      acc[r.program.id] = { school: r.program.school, department: r.program.department, items: [] };
    }
    acc[r.program.id].items.push(r);
    return acc;
  }, {});

  const programIds = Object.keys(byProgram);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        {selectionBar}
        <div className="flex shrink-0 gap-3 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => collapseAll(programIds)}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </div>
      {Object.entries(byProgram).map(([programId, { school, department, items }]) => {
        const isCollapsed = collapsed.has(programId);
        return (
          <div key={programId} className="space-y-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCollapsed(programId)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Expand" : "Collapse"}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                />
              </button>
              <Link
                href={`/programs/${programId}?tab=requirements`}
                className="min-w-0 shrink truncate text-sm font-medium hover:underline"
              >
                {school}
              </Link>
              <span className="min-w-0 shrink truncate text-xs text-muted-foreground">
                {department}
              </span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            {!isCollapsed && items.map((r) => renderRow(r, false))}
          </div>
        );
      })}
    </div>
  );
}

function RequirementsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const search = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "program";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (
        value === "all" ||
        value === "" ||
        (key === "sort" && value === "program")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return (
    <>
      <div className="mb-6 space-y-6">
        <h1 className="text-2xl font-semibold">Requirements</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setParam("q", e.target.value)}
            className="h-9 text-sm sm:flex-1"
          />
          <div className="flex gap-2">
            <Select value={sort} onValueChange={(v) => v && setParam("sort", v)}>
              <SelectTrigger className="h-9 flex-1 text-sm sm:w-36 sm:flex-none">
                <SelectValue>
                  {sort === "due_date" ? "By due date" : "By program"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program">By program</SelectItem>
                <SelectItem value="due_date">By due date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => v && setParam("status", v)}>
              <SelectTrigger className="h-9 flex-1 text-sm sm:w-36 sm:flex-none">
                <SelectValue>
                  {statusFilter === "all"
                    ? "All statuses"
                    : REQUIREMENT_STATUS_LABEL[statusFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <RequirementsList statusFilter={statusFilter} search={search} sort={sort} />
    </>
  );
}

function RequirementsPageSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </>
  );
}

export default function RequirementsPage() {
  usePageTitle("Requirements");
  return (
    <RequireAuth>
      <Suspense fallback={<RequirementsPageSkeleton />}>
        <RequirementsInner />
      </Suspense>
    </RequireAuth>
  );
}
