"use client";

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { safeExternalUrl } from "@/lib/url";
import { Program, ProgramStatus, RequirementWithProgram, DeadlineWithProgram } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { ProgramDialog } from "@/components/program-dialog";
import { ImportProgramsDialog } from "@/components/import-programs-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/lib/use-page-title";
import { LayoutList, LayoutGrid, Download, Plus, Upload } from "lucide-react";
import { onMutationError } from "@/lib/mutation-error";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type SortKey = "school" | "tier" | "status" | "deadline";

const BOARD_STATUSES: ProgramStatus[] = [
  "researching",
  "drafting",
  "submitted",
  "interview",
  "accepted",
  "waitlisted",
  "rejected",
];

const TIER_ORDER = { reach: 0, match: 1, likely: 2 };
const STATUS_ORDER = {
  researching: 0,
  drafting: 1,
  submitted: 2,
  interview: 3,
  accepted: 4,
  waitlisted: 5,
  rejected: 6,
};

function sortPrograms(programs: Program[], key: SortKey, deadlineMap?: Map<number, string>): Program[] {
  return [...programs].sort((a, b) => {
    if (key === "school") return a.school.localeCompare(b.school);
    if (key === "tier") return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (key === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (key === "deadline") {
      const aDate = deadlineMap?.get(a.id);
      const bDate = deadlineMap?.get(b.id);
      if (!aDate && !bDate) return a.school.localeCompare(b.school);
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.localeCompare(bDate);
    }
    return 0;
  });
}

function ProgramCard({ program, reqCount }: { program: Program; reqCount?: { done: number; total: number } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(program.notes ?? "");

  const updateStatus = useMutation({
    mutationFn: (status: ProgramStatus) =>
      api.patch<Program>(`/programs/${program.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: (notes: string) =>
      api.patch(`/programs/${program.id}`, { notes: notes || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
    onError: onMutationError,
  });

  return (
    <Card
      className="group cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/programs/${program.id}`)}
    >
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{program.school}</CardTitle>
          <Badge variant={PROGRAM_TIER_VARIANT[program.tier]}>
            {PROGRAM_TIER_LABEL[program.tier]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{program.department} · {program.degree}</p>
          {reqCount && reqCount.total > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {reqCount.done}/{reqCount.total} done
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {program.app_fee != null && <span>${program.app_fee} fee</span>}
          {safeExternalUrl(program.url) && (
            <a
              href={safeExternalUrl(program.url)!}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              Website
            </a>
          )}
        </div>
        {editingNotes ? (
          <textarea
            autoFocus
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={() => { updateNotes.mutate(notesValue); setEditingNotes(false); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setNotesValue(program.notes ?? ""); setEditingNotes(false); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); updateNotes.mutate(notesValue); setEditingNotes(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
          />
        ) : program.notes ? (
            <p
              className="cursor-pointer truncate text-xs text-muted-foreground hover:opacity-70"
              onClick={(e) => { e.stopPropagation(); setEditingNotes(true); setNotesValue(program.notes ?? ""); }}
            >
              {program.notes}
            </p>
          ) : (
            <button
              className="w-full rounded border border-dashed border-transparent px-2 py-0.5 text-left text-xs text-muted-foreground/0 opacity-0 transition-opacity group-hover:border-muted-foreground/20 group-hover:text-muted-foreground/50 group-hover:opacity-100 hover:!border-muted-foreground/40 hover:!text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); setEditingNotes(true); setNotesValue(""); }}
            >
              + Add note
            </button>
          )}
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={program.status}
            onValueChange={(v) => v && updateStatus.mutate(v as ProgramStatus)}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue>{PROGRAM_STATUS_LABEL[program.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="researching">Researching</SelectItem>
              <SelectItem value="drafting">Drafting</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramList({
  sort,
  tierFilter,
  statusFilter,
  search,
}: {
  sort: SortKey;
  tierFilter: string;
  statusFilter: string;
  search: string;
}) {
  const { data, isLoading, error } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
  });

  const { data: requirements = [] } = useQuery<RequirementWithProgram[]>({
    queryKey: ["requirements-all"],
    queryFn: () => api.get("/requirements"),
  });

  const { data: allDeadlines = [] } = useQuery<DeadlineWithProgram[]>({
    queryKey: ["deadlines"],
    queryFn: () => api.get("/deadlines"),
    enabled: sort === "deadline",
  });

  const nextDeadlineMap = useMemo(() => {
    if (sort !== "deadline") return undefined;
    const today = new Date().toISOString().slice(0, 10);
    const map = new Map<number, string>();
    for (const d of allDeadlines) {
      if (d.done || d.due_date < today) continue;
      const existing = map.get(d.program.id);
      if (!existing || d.due_date < existing) map.set(d.program.id, d.due_date);
    }
    return map;
  }, [allDeadlines, sort]);

  const reqCounts = useMemo(() => {
    const counts = new Map<number, { done: number; total: number }>();
    for (const r of requirements) {
      const c = counts.get(r.program.id) ?? { done: 0, total: 0 };
      counts.set(r.program.id, {
        done: c.done + (r.status === "done" || r.status === "waived" ? 1 : 0),
        total: c.total + 1,
      });
    }
    return counts;
  }, [requirements]);

  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  if (error) return <ErrorState title="Failed to load programs" message="Something went wrong. Try refreshing the page." />;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No programs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hit the button above or add one here.
        </p>
        <ProgramDialog
          trigger={
            <button className="mt-4 text-sm underline underline-offset-4">
              Add a program →
            </button>
          }
        />
      </div>
    );

  const q = search.toLowerCase();
  const filtered = data
    .filter((p) => tierFilter === "all" || p.tier === tierFilter)
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter(
      (p) =>
        !q ||
        p.school.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    );

  const sorted = sortPrograms(filtered, sort, nextDeadlineMap);

  if (sorted.length === 0)
    return <p className="text-muted-foreground">No programs match the current filters.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((p) => (
        <ProgramCard key={p.id} program={p} reqCount={reqCounts.get(p.id)} />
      ))}
    </div>
  );
}

function BoardView({ tierFilter, search }: { tierFilter: string; search: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProgramStatus | null>(null);

  const { data, isLoading, error } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProgramStatus }) =>
      api.patch<Program>(`/programs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onMutationError,
  });

  if (isLoading)
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_STATUSES.map((s) => (
          <div key={s} className="w-56 shrink-0 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  if (error) return <ErrorState title="Failed to load programs" message="Something went wrong. Try refreshing the page." />;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No programs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hit the button above or add one here.
        </p>
        <ProgramDialog
          trigger={
            <button className="mt-4 text-sm underline underline-offset-4">
              Add a program →
            </button>
          }
        />
      </div>
    );

  const q = search.toLowerCase();
  const filtered = data
    .filter((p) => tierFilter === "all" || p.tier === tierFilter)
    .filter(
      (p) =>
        !q ||
        p.school.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
    );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {BOARD_STATUSES.map((status) => {
          const col = filtered.filter((p) => p.status === status);
          const isOver = dragOverStatus === status;
          return (
            <div
              key={status}
              className={`w-56 shrink-0 space-y-2 rounded-lg p-1 transition-colors ${isOver ? "bg-muted/60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStatus(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedId !== null) {
                  const program = data.find((p) => p.id === draggedId);
                  if (program && program.status !== status) {
                    updateStatus.mutate({ id: draggedId, status });
                  }
                }
                setDraggedId(null);
                setDragOverStatus(null);
              }}
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {PROGRAM_STATUS_LABEL[status]}
                </h2>
                <span className="text-xs text-muted-foreground">{col.length}</span>
              </div>
              {col.length === 0 && (
                <div className={`rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground transition-colors ${isOver ? "border-primary/40 bg-primary/5" : ""}`}>
                  Drop here
                </div>
              )}
              {col.map((p) => (
                <Card
                  key={p.id}
                  draggable
                  className={`cursor-grab transition-shadow hover:shadow-md active:cursor-grabbing ${draggedId === p.id ? "opacity-50" : ""}`}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedId(p.id);
                  }}
                  onDragEnd={() => { setDraggedId(null); setDragOverStatus(null); }}
                  onClick={() => { if (draggedId === null) router.push(`/programs/${p.id}`); }}
                >
                  <CardHeader className="px-3 pb-1 pt-3">
                    <div className="flex items-start justify-between gap-1">
                      <CardTitle className="text-sm leading-snug">{p.school}</CardTitle>
                      <Badge
                        variant={PROGRAM_TIER_VARIANT[p.tier]}
                        className="shrink-0 text-xs"
                      >
                        {PROGRAM_TIER_LABEL[p.tier]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <p className="text-xs text-muted-foreground">{p.department}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgramsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [newProgramOpen, setNewProgramOpen] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");
  const queryClient = useQueryClient();

  const EXPORT_FIELDS = [
    { key: "department", label: "Department" },
    { key: "degree", label: "Degree" },
    { key: "tier", label: "Tier" },
    { key: "status", label: "Status" },
    { key: "app_fee", label: "App Fee" },
    { key: "url", label: "URL" },
    { key: "notes", label: "Notes" },
  ] as const;

  type ExportFieldKey = typeof EXPORT_FIELDS[number]["key"];

  const [selectedFields, setSelectedFields] = useState<Set<ExportFieldKey>>(
    new Set(EXPORT_FIELDS.map((f) => f.key))
  );

  function toggleField(key: ExportFieldKey) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    const saved = localStorage.getItem("programs_view");
    // Mount-time sync from localStorage; unavailable during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "board") setView("board");
  }, []);

  function handleViewChange(v: "list" | "board") {
    setView(v);
    localStorage.setItem("programs_view", v);
  }

  function handleExport() {
    const programs = queryClient.getQueryData<Program[]>(["programs"]);
    if (!programs?.length) return;

    const allColumns: { key: string; label: string; value: (p: Program) => string | number }[] = [
      { key: "school", label: "School", value: (p) => p.school },
      { key: "department", label: "Department", value: (p) => p.department },
      { key: "degree", label: "Degree", value: (p) => p.degree },
      { key: "tier", label: "Tier", value: (p) => p.tier },
      { key: "status", label: "Status", value: (p) => p.status },
      { key: "app_fee", label: "App Fee", value: (p) => p.app_fee ?? "" },
      { key: "url", label: "URL", value: (p) => p.url ?? "" },
      { key: "notes", label: "Notes", value: (p) => p.notes ?? "" },
    ];

    const cols = allColumns.filter(
      (c) => c.key === "school" || selectedFields.has(c.key as ExportFieldKey)
    );

    const csv = [
      cols.map((c) => c.label),
      ...programs.map((p) => cols.map((c) => c.value(p))),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dossier-programs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setNewProgramOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const sort = (searchParams.get("sort") as SortKey) ?? "school";
  const tierFilter = searchParams.get("tier") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const search = searchParams.get("q") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "" || (key === "sort" && value === "school")) {
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
        <h1 className="text-2xl font-semibold">Programs</h1>
        <div className="flex items-center gap-2">
          <div className="hidden h-8 items-center rounded-md border md:flex">
            <Button
              variant="ghost"
              size="sm"
              className={`h-full rounded-r-none px-2 ${view === "list" ? "bg-muted" : ""}`}
              onClick={() => handleViewChange("list")}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-full rounded-l-none px-2 ${view === "board" ? "bg-muted" : ""}`}
              onClick={() => handleViewChange("board")}
              aria-label="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Export CSV" title="Export CSV" />}>
              <Download className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52">
              <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Export fields</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 opacity-50">
                  <Checkbox checked disabled />
                  <Label className="text-sm font-normal">School</Label>
                </div>
                {EXPORT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`field-${key}`}
                      checked={selectedFields.has(key)}
                      onCheckedChange={() => toggleField(key)}
                    />
                    <Label htmlFor={`field-${key}`} className="text-sm font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" size="sm" onClick={handleExport}>
                Download CSV
              </Button>
            </PopoverContent>
          </Popover>
          <ImportProgramsDialog
            trigger={
              <Button variant="outline">
                <Upload />
                Import
              </Button>
            }
          />
          <ProgramDialog
            trigger={<Button><Plus />New program</Button>}
            open={newProgramOpen}
            onOpenChange={setNewProgramOpen}
          />
        </div>
      </div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search school or department…"
          value={search}
          onChange={(e) => setParam("q", e.target.value)}
          className="h-8 text-sm sm:flex-1"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Select value={tierFilter} onValueChange={(v) => v && setParam("tier", v)}>
              <SelectTrigger className="h-9 flex-1 text-sm sm:w-28 sm:flex-none">
                <SelectValue>
                  {tierFilter === "all" ? "All tiers" : PROGRAM_TIER_LABEL[tierFilter as keyof typeof PROGRAM_TIER_LABEL]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="reach">Reach</SelectItem>
                <SelectItem value="match">Match</SelectItem>
                <SelectItem value="likely">Likely</SelectItem>
              </SelectContent>
            </Select>
            {view === "list" && (
              <Select value={statusFilter} onValueChange={(v) => v && setParam("status", v)}>
                <SelectTrigger className="h-9 flex-1 text-sm sm:w-36 sm:flex-none">
                  <SelectValue>
                    {statusFilter === "all" ? "All statuses" : PROGRAM_STATUS_LABEL[statusFilter as keyof typeof PROGRAM_STATUS_LABEL]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="researching">Researching</SelectItem>
                  <SelectItem value="drafting">Drafting</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {view === "list" && (
            <Select value={sort} onValueChange={(v) => v && setParam("sort", v)}>
              <SelectTrigger className="h-9 w-auto text-sm sm:w-36">
                <SelectValue>
                  {sort === "school" ? "Sort: Name" : sort === "tier" ? "Sort: Tier" : sort === "status" ? "Sort: Status" : "Sort: Deadline"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Sort: Name</SelectItem>
                <SelectItem value="tier">Sort: Tier</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
                <SelectItem value="deadline">Sort: Deadline</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      {/* Mobile always shows list; desktop respects saved view preference */}
      <div className="md:hidden">
        <ProgramList sort={sort} tierFilter={tierFilter} statusFilter={statusFilter} search={search} />
      </div>
      <div className="hidden md:block">
        {view === "board" ? (
          <BoardView tierFilter={tierFilter} search={search} />
        ) : (
          <ProgramList sort={sort} tierFilter={tierFilter} statusFilter={statusFilter} search={search} />
        )}
      </div>
    </>
  );
}

function ProgramsPageSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function ProgramsPage() {
  usePageTitle("Programs");
  return (
    <RequireAuth>
      <Suspense fallback={<ProgramsPageSkeleton />}>
        <ProgramsInner />
      </Suspense>
    </RequireAuth>
  );
}
