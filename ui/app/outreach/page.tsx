"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { OutreachContactWithProgram } from "@/lib/types";
import { OUTREACH_RESPONSE_LABEL, formatDate } from "@/lib/display";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { usePageTitle } from "@/lib/use-page-title";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RESPONSE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  none: "outline",
  positive: "default",
  negative: "destructive",
  meeting_scheduled: "secondary",
};

type ByProgram = Record<
  string,
  { school: string; department: string; programId: number; items: OutreachContactWithProgram[] }
>;

function OutreachInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const responseFilter = searchParams.get("response") ?? "all";
  const search = searchParams.get("q") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const { data = [], isLoading, error } = useQuery<OutreachContactWithProgram[]>({
    queryKey: ["outreach-all"],
    queryFn: () => api.get("/outreach"),
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );

  if (error) return <ErrorState title="Failed to load outreach contacts" message="Something went wrong. Try refreshing the page." />;

  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No outreach contacts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add faculty contacts from a program's Outreach tab.
        </p>
        <Link
          href="/programs"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Go to programs →
        </Link>
      </div>
    );

  const q = search.toLowerCase();
  const filtered = data
    .filter((c) => responseFilter === "all" || c.response === responseFilter)
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        c.program.school.toLowerCase().includes(q)
    );

  const byProgram = filtered.reduce<ByProgram>((acc, c) => {
    const key = String(c.program.id);
    if (!acc[key]) {
      acc[key] = {
        school: c.program.school,
        department: c.program.department,
        programId: c.program.id,
        items: [],
      };
    }
    acc[key].items.push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setParam("q", e.target.value)}
          className="h-9 w-48 text-sm"
        />
        <Select value={responseFilter} onValueChange={(v) => v && setParam("response", v)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue>
              {responseFilter === "all"
                ? "All responses"
                : OUTREACH_RESPONSE_LABEL[responseFilter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All responses</SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="meeting_scheduled">Meeting scheduled</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing matches the current filter.</p>
      )}

      {Object.entries(byProgram).map(([programId, { school, department, items }]) => (
        <div key={programId} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/programs/${programId}?tab=outreach`}
              className="text-sm font-medium hover:underline"
            >
              {school}
            </Link>
            <span className="text-xs text-muted-foreground">{department}</span>
          </div>
          {items.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 font-medium">{c.name}</span>
              <div className="ml-auto flex items-center gap-2">
                {c.contacted_on && (
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {formatDate(c.contacted_on)}
                  </span>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="hidden text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground sm:block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.email}
                  </a>
                )}
                <Badge variant={RESPONSE_VARIANT[c.response]}>
                  {OUTREACH_RESPONSE_LABEL[c.response]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function OutreachPage() {
  usePageTitle("Outreach");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Outreach</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        }
      >
        <OutreachInner />
      </Suspense>
    </RequireAuth>
  );
}
