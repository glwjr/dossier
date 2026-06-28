"use client";

import { useCallback, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Program, ProgramStatus } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ProgramDialog } from "@/components/program-dialog";
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

type SortKey = "school" | "tier" | "status";

const TIER_ORDER = { reach: 0, match: 1, likely: 2 };
const STATUS_ORDER = {
  researching: 0,
  drafting: 1,
  submitted: 2,
  interview: 3,
  decision: 4,
};

function sortPrograms(programs: Program[], key: SortKey): Program[] {
  return [...programs].sort((a, b) => {
    if (key === "school") return a.school.localeCompare(b.school);
    if (key === "tier") return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (key === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return 0;
  });
}

function ProgramCard({ program }: { program: Program }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: ProgramStatus) =>
      api.patch<Program>(`/programs/${program.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
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
        <p className="text-sm text-muted-foreground">{program.department} · {program.degree}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {program.app_fee != null && <span>${program.app_fee} fee</span>}
          {program.url && (
            <a
              href={program.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              Website
            </a>
          )}
        </div>
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
              <SelectItem value="decision">Decision</SelectItem>
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
  if (error) return <p className="text-destructive">Failed to load programs.</p>;
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

  const sorted = sortPrograms(filtered, sort);

  if (sorted.length === 0)
    return <p className="text-muted-foreground">No programs match the current filters.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((p) => (
        <ProgramCard key={p.id} program={p} />
      ))}
    </div>
  );
}

function ProgramsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <ProgramDialog trigger={<Button>New program</Button>} />
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search school or department…"
          value={search}
          onChange={(e) => setParam("q", e.target.value)}
          className="h-9 w-56 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tierFilter} onValueChange={(v) => v && setParam("tier", v)}>
            <SelectTrigger className="h-9 w-28 text-sm">
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
          <Select value={statusFilter} onValueChange={(v) => v && setParam("status", v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
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
              <SelectItem value="decision">Decision</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => v && setParam("sort", v)}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue>
                {sort === "school" ? "Sort: Name" : sort === "tier" ? "Sort: Tier" : "Sort: Status"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">Sort: Name</SelectItem>
              <SelectItem value="tier">Sort: Tier</SelectItem>
              <SelectItem value="status">Sort: Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ProgramList sort={sort} tierFilter={tierFilter} statusFilter={statusFilter} search={search} />
    </>
  );
}

export default function ProgramsPage() {
  usePageTitle("Programs");
  return (
    <RequireAuth>
      <Suspense>
        <ProgramsInner />
      </Suspense>
    </RequireAuth>
  );
}
