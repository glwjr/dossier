"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePageTitle } from "@/lib/use-page-title";

const STATUS_COLOR: Record<string, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-yellow-600",
  done: "text-green-600 dark:text-green-500",
  waived: "text-muted-foreground line-through",
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
    onError: () => toast.error("Something went wrong"),
  });

  const updateNotes = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      api.patch(`/requirements/${id}`, { notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
    onError: () => toast.error("Something went wrong"),
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
    onError: () => toast.error("Something went wrong"),
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
  if (error) return <p className="text-destructive">Failed to load requirements.</p>;
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
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            disabled={bulkUpdate.isPending}
            onClick={() => bulkUpdate.mutate({ ids: [...selectedIds], status: "in_progress" })}
          >
            In progress
          </Button>
          <Button
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={bulkUpdate.isPending}
            onClick={() => bulkUpdate.mutate({ ids: [...selectedIds], status: "done" })}
          >
            Done
          </Button>
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
        className="group flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm"
      >
        {showProgram && (
          <Link
            href={`/programs/${r.program.id}?tab=requirements`}
            className="w-full text-xs text-muted-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.program.school} · {r.program.department}
          </Link>
        )}
        <Checkbox
          checked={selectedIds.has(r.id)}
          onCheckedChange={() => toggleSelect(r.id)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
        <span className={`min-w-0 flex-1 ${STATUS_COLOR[r.status]}`}>{r.label}</span>
        <div className="ml-auto flex items-center gap-2">
          {r.due_date && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {formatDate(r.due_date)}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground sm:block">
            {REQUIREMENT_KIND_LABEL[r.kind]}
          </span>
          <Select
            value={r.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: r.id, status: v })}
          >
            <SelectTrigger className="h-7 w-24 text-xs sm:w-32">
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
        <div className="w-full">
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

  return (
    <div className="space-y-6">
      {selectionBar}
      {Object.entries(byProgram).map(([programId, { school, department, items }]) => (
        <div key={programId} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Link href={`/programs/${programId}?tab=requirements`} className="text-sm font-medium hover:underline">
              {school}
            </Link>
            <span className="text-xs text-muted-foreground">{department}</span>
          </div>
          {items.map((r) => renderRow(r, false))}
        </div>
      ))}
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Requirements</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setParam("q", e.target.value)}
            className="h-9 w-48 text-sm"
          />
          <Select value={sort} onValueChange={(v) => v && setParam("sort", v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
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
            <SelectTrigger className="h-9 w-36 text-sm">
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
