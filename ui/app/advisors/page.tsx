"use client";

import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
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
  const sort = searchParams.get("sort") ?? "program";
  const search = searchParams.get("q") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || (key === "sort" && value === "program")) {
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

  if (error) return <ErrorState title="Failed to load advisors" message="Something went wrong. Try refreshing the page." />;

  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No advisors yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add potential advisors from a program's Advisors tab.
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
        (c.research_area ?? "").toLowerCase().includes(q) ||
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

  const RESPONSE_ORDER = ["positive", "meeting_scheduled", "none", "negative"] as const;
  const byResponse = RESPONSE_ORDER
    .map((r) => ({ response: r, items: filtered.filter((c) => c.response === r) }))
    .filter(({ items }) => items.length > 0);

  function renderContact(c: OutreachContactWithProgram, showProgram = false) {
    return (
      <div key={c.id} className="flex items-start gap-4 rounded-md border px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          {showProgram && (
            <Link
              href={`/programs/${c.program.id}?tab=outreach`}
              className="mb-1 block truncate text-xs text-muted-foreground hover:underline"
            >
              {c.program.school} · {c.program.department}
            </Link>
          )}
          <span className="block truncate font-medium">{c.name}</span>
          {c.research_area && (
            <span className="block truncate text-xs text-muted-foreground">
              {c.research_area}
            </span>
          )}
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="mt-1 block truncate text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {c.email}
            </a>
          )}
          {c.url && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              Profile
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          {c.notes && (
            <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="mb-2">
            <Badge variant={RESPONSE_VARIANT[c.response]}>
              {OUTREACH_RESPONSE_LABEL[c.response]}
            </Badge>
          </div>
          {c.contacted_on && (
            <p className="text-xs text-muted-foreground">{formatDate(c.contacted_on)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                {sort === "response" ? "By response" : "By program"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="program">By program</SelectItem>
              <SelectItem value="response">By response</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responseFilter} onValueChange={(v) => v && setParam("response", v)}>
            <SelectTrigger className="h-9 flex-1 text-sm sm:w-40 sm:flex-none">
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
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing matches the current filter.</p>
      )}

      {sort === "response" ? (
        byResponse.map(({ response, items }) => (
          <div key={response} className="space-y-3">
            <p className="text-sm font-medium">{OUTREACH_RESPONSE_LABEL[response]}</p>
            {items.map((c) => renderContact(c, true))}
          </div>
        ))
      ) : (
        Object.entries(byProgram).map(([programId, { school, department, items }]) => (
          <div key={programId} className="space-y-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <Link
                href={`/programs/${programId}?tab=outreach`}
                className="min-w-0 shrink truncate text-sm font-medium hover:underline"
              >
                {school}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{department}</span>
            </div>
            {items.map((c) => renderContact(c))}
          </div>
        ))
      )}
    </div>
  );
}

export default function AdvisorsPage() {
  usePageTitle("Advisors");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Advisors</h1>
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
