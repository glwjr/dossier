"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { Program } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
  daysUntil,
  formatDate,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/lib/use-page-title";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  researching: "outline",
  drafting: "outline",
  submitted: "secondary",
  interview: "secondary",
  accepted: "default",
  waitlisted: "secondary",
  rejected: "destructive",
};

function CompareInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: programs = [], isLoading, isError } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
  });

  const rawIds = searchParams.get("programs");
  const selectedIds: number[] = rawIds
    ? rawIds.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
    : [];

  // Only auto-select when the key is truly absent (first visit); rawIds === ""
  // means the user explicitly cleared all selections.
  useEffect(() => {
    if (rawIds === null && programs.length > 0) {
      const accepted = programs
        .filter((p) => p.status === "accepted")
        .slice(0, 4)
        .map((p) => p.id);
      if (accepted.length > 0) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("programs", accepted.join(","));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [programs, rawIds, router, pathname, searchParams]);

  function setIds(ids: number[]) {
    const params = new URLSearchParams(searchParams.toString());
    // Use empty string (not delete) so rawIds stays non-null and auto-select
    // doesn't re-trigger when the user intentionally clears all selections.
    params.set("programs", ids.join(","));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      setIds(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < 4) {
      setIds([...selectedIds, id]);
    }
  }

  const selected = selectedIds
    .map((id) => programs.find((p) => p.id === id))
    .filter(Boolean) as Program[];

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (isError)
    return (
      <ErrorState
        title="Failed to load programs"
        message="Something went wrong. Try refreshing the page."
      />
    );

  const TIER_LABEL = PROGRAM_TIER_LABEL;
  const TIER_VARIANT = PROGRAM_TIER_VARIANT;

  return (
    <div className="space-y-6">
      {/* Program picker */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {programs.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const isDisabled = !isSelected && selectedIds.length >= 4;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={isDisabled}
              className={`inline-flex min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "border-foreground/40 bg-muted font-medium text-foreground"
                  : isDisabled
                  ? "cursor-not-allowed border-border text-muted-foreground/30"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <span className="truncate">{p.school}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {PROGRAM_STATUS_LABEL[p.status]}
              </span>
            </button>
          );
        })}
      </div>
      {selectedIds.length === 4 && (
        <p className="text-xs text-muted-foreground">Max 4 selected</p>
      )}

      {selected.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium">No programs selected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select up to 4 programs above to compare them side by side.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 w-28 bg-background px-4 py-3 sm:w-32" />
                {selected.map((p) => (
                  <th
                    key={p.id}
                    className="min-w-[180px] px-4 py-3 text-left font-medium"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/programs/${p.id}`}
                          className="block truncate hover:underline"
                        >
                          {p.school}
                        </Link>
                        <p className="truncate text-xs font-normal text-muted-foreground">
                          {p.department}
                        </p>
                      </div>
                      <button
                        onClick={() => toggle(p.id)}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${p.school}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </td>
                {selected.map((p) => (
                  <td key={p.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_VARIANT[p.status]}>
                        {PROGRAM_STATUS_LABEL[p.status]}
                      </Badge>
                      <Badge variant={TIER_VARIANT[p.tier]}>
                        {TIER_LABEL[p.tier]}
                      </Badge>
                    </div>
                  </td>
                ))}
              </tr>

              <tr className="border-b">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-medium text-muted-foreground">
                  Location
                </td>
                {selected.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-muted-foreground">
                    {p.location ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
              </tr>

              <tr className="border-b">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-medium text-muted-foreground">
                  Stipend
                </td>
                {selected.map((p) => (
                  <td key={p.id} className="px-4 py-3">
                    {p.stipend != null ? (
                      <span>
                        <span className="font-medium">
                          ${p.stipend.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">/yr</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr className="border-b">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-medium text-muted-foreground">
                  Decision by
                </td>
                {selected.map((p) => {
                  if (!p.decision_deadline)
                    return (
                      <td key={p.id} className="px-4 py-3 text-muted-foreground/40">
                        —
                      </td>
                    );
                  const days = daysUntil(p.decision_deadline);
                  const overdue = days < 0;
                  const urgent = !overdue && days <= 14;
                  return (
                    <td key={p.id} className="px-4 py-3">
                      <p
                        className={
                          overdue
                            ? "font-medium text-destructive"
                            : urgent
                            ? "font-medium text-yellow-600"
                            : ""
                        }
                      >
                        {formatDate(p.decision_deadline)}
                      </p>
                      <p
                        className={`text-xs ${
                          overdue
                            ? "text-destructive"
                            : urgent
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {overdue
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? "Today"
                          : `${days}d`}
                      </p>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="sticky left-0 z-10 bg-background px-4 py-3 text-xs font-medium text-muted-foreground">
                  Notes
                </td>
                {selected.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-muted-foreground">
                    {p.notes ? (
                      <p className="line-clamp-4">{p.notes}</p>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  usePageTitle("Compare");
  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold">Compare</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <CompareInner />
      </Suspense>
    </RequireAuth>
  );
}
