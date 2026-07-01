"use client";

import { Suspense } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { AdvisorWithProgram } from "@/lib/types";
import { ADVISOR_RESPONSE_LABEL, formatDate } from "@/lib/display";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { usePageTitle } from "@/lib/use-page-title";
import { useCollapsedSections } from "@/lib/use-collapsed";
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
  { school: string; department: string; programId: number; items: AdvisorWithProgram[] }
>;

function AdvisorsInner() {
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

  const { data = [], isLoading, error } = useQuery<AdvisorWithProgram[]>({
    queryKey: ["advisors-all"],
    queryFn: () => api.get("/advisors"),
  });

  const {
    collapsed,
    toggle: toggleCollapsed,
    collapseAll,
    expandAll,
  } = useCollapsedSections("dossier_collapsed_advisors");

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
          Add potential advisors from a program&apos;s Advisors tab.
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

  const sectionKeys =
    sort === "response"
      ? byResponse.map((b) => b.response)
      : Object.keys(byProgram);

  function renderContact(c: AdvisorWithProgram, showProgram = false) {
    return (
      <div key={c.id} className="flex items-start gap-4 rounded-md border px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          {showProgram && (
            <Link
              href={`/programs/${c.program.id}?tab=advisors`}
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
              {ADVISOR_RESPONSE_LABEL[c.response]}
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
          className="h-8 text-sm sm:flex-1"
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
                  : ADVISOR_RESPONSE_LABEL[responseFilter]}
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

      {filtered.length > 0 && (
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
            onClick={() => collapseAll(sectionKeys)}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      )}

      {sort === "response"
        ? byResponse.map(({ response, items }) => {
            const isCollapsed = collapsed.has(response);
            return (
              <div key={response} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(response)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-2 text-sm font-medium hover:text-foreground"
                >
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  />
                  {ADVISOR_RESPONSE_LABEL[response]}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </button>
                {!isCollapsed && items.map((c) => renderContact(c, true))}
              </div>
            );
          })
        : Object.entries(byProgram).map(([programId, { school, department, items }]) => {
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
                    href={`/programs/${programId}?tab=advisors`}
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
                {!isCollapsed && items.map((c) => renderContact(c))}
              </div>
            );
          })}
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
        <AdvisorsInner />
      </Suspense>
    </RequireAuth>
  );
}
