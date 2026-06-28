"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
        <p className="text-sm text-muted-foreground">{program.department}</p>
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
}: {
  sort: SortKey;
  tierFilter: string;
  statusFilter: string;
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
  if (!data?.length) return <p className="text-muted-foreground">No programs yet.</p>;

  const filtered = data
    .filter((p) => tierFilter === "all" || p.tier === tierFilter)
    .filter((p) => statusFilter === "all" || p.status === statusFilter);

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

export default function ProgramsPage() {
  const [sort, setSort] = useState<SortKey>("school");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tierFilter} onValueChange={(v) => v && setTierFilter(v)}>
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
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
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
          <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
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
          <ProgramDialog trigger={<Button>New program</Button>} />
        </div>
      </div>
      <ProgramList sort={sort} tierFilter={tierFilter} statusFilter={statusFilter} />
    </RequireAuth>
  );
}
