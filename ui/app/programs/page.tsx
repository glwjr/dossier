"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Program } from "@/lib/types";
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

function ProgramList({ sort }: { sort: SortKey }) {
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

  const sorted = sortPrograms(data, sort);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((p) => (
        <Link key={p.id} href={`/programs/${p.id}`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{p.school}</CardTitle>
                <Badge variant={PROGRAM_TIER_VARIANT[p.tier]}>
                  {PROGRAM_TIER_LABEL[p.tier]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.department}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {PROGRAM_STATUS_LABEL[p.status]}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function ProgramsPage() {
  const [sort, setSort] = useState<SortKey>("school");

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={(v) => v && setSort(v as SortKey)}
          >
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue>
                {sort === "school" ? "Name" : sort === "tier" ? "Tier" : "Status"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">Name</SelectItem>
              <SelectItem value="tier">Tier</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <ProgramDialog trigger={<Button>New program</Button>} />
        </div>
      </div>
      <ProgramList sort={sort} />
    </RequireAuth>
  );
}
