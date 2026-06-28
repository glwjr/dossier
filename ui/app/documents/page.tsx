"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { DocumentWithProgram } from "@/lib/types";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/lib/use-page-title";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  in_progress: "secondary",
  final: "default",
};

function DocumentsList({ statusFilter, kindFilter }: { statusFilter: string; kindFilter: string }) {
  const { data, isLoading, error } = useQuery<DocumentWithProgram[]>({
    queryKey: ["documents-all"],
    queryFn: () => api.get("/documents"),
  });

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  if (error) return <p className="text-destructive">Failed to load documents.</p>;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No documents yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add documents from each program&apos;s detail page.
        </p>
        <Link href="/programs" className="mt-4 inline-block text-sm underline underline-offset-4">
          Go to programs →
        </Link>
      </div>
    );

  const filtered = data
    .filter((d) => statusFilter === "all" || d.status === statusFilter)
    .filter((d) => kindFilter === "all" || d.kind === kindFilter);

  if (filtered.length === 0)
    return <p className="text-sm text-muted-foreground">No documents match the current filter.</p>;

  const byProgram = filtered.reduce<
    Record<number, { school: string; department: string; items: DocumentWithProgram[] }>
  >((acc, d) => {
    if (!acc[d.program.id]) {
      acc[d.program.id] = { school: d.program.school, department: d.program.department, items: [] };
    }
    acc[d.program.id].items.push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byProgram).map(([programId, { school, department, items }]) => (
        <div key={programId} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/programs/${programId}?tab=documents`}
              className="text-sm font-medium hover:underline"
            >
              {school}
            </Link>
            <span className="text-xs text-muted-foreground">{department}</span>
          </div>
          {items.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 font-medium">{d.title}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {DOCUMENT_KIND_LABEL[d.kind]}
                </span>
                <Badge variant={STATUS_VARIANT[d.status]}>
                  {DOCUMENT_STATUS_LABEL[d.status]}
                </Badge>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:opacity-70"
                  >
                    Open
                  </a>
                )}
              </div>
              {d.notes && (
                <p className="w-full text-xs text-muted-foreground">{d.notes}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DocumentsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const kindFilter = searchParams.get("kind") ?? "all";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete(key);
      else params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kindFilter} onValueChange={(v) => v && setParam("kind", v)}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue>
                {kindFilter === "all" ? "All kinds" : DOCUMENT_KIND_LABEL[kindFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="sop">SOP</SelectItem>
              <SelectItem value="personal_statement">Personal statement</SelectItem>
              <SelectItem value="cv">CV</SelectItem>
              <SelectItem value="writing_sample">Writing sample</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => v && setParam("status", v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue>
                {statusFilter === "all" ? "All statuses" : DOCUMENT_STATUS_LABEL[statusFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DocumentsList statusFilter={statusFilter} kindFilter={kindFilter} />
    </>
  );
}

function DocumentsPageSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </>
  );
}

export default function DocumentsPage() {
  usePageTitle("Documents");
  return (
    <RequireAuth>
      <Suspense fallback={<DocumentsPageSkeleton />}>
        <DocumentsInner />
      </Suspense>
    </RequireAuth>
  );
}
