"use client";

import { Suspense, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { DocumentWithProgram } from "@/lib/types";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/lib/display";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/lib/use-page-title";

function DocumentsList({ statusFilter, kindFilter, search, sort }: { statusFilter: string; kindFilter: string; search: string; sort: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<DocumentWithProgram[]>({
    queryKey: ["documents-all"],
    queryFn: () => api.get("/documents"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: onMutationError,
  });

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  if (error) return <ErrorState title="Failed to load documents" message="Something went wrong. Try refreshing the page." />;
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

  const q = search.toLowerCase();
  const filtered = data
    .filter((d) => statusFilter === "all" || d.status === statusFilter)
    .filter((d) => kindFilter === "all" || d.kind === kindFilter)
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.program.school.toLowerCase().includes(q));

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

  const KIND_ORDER = ["sop", "personal_statement", "cv", "writing_sample", "other"] as const;
  const byKind = KIND_ORDER
    .map((k) => ({ kind: k, items: filtered.filter((d) => d.kind === k) }))
    .filter(({ items }) => items.length > 0);

  function renderDocument(d: DocumentWithProgram, showProgram = false) {
    return (
      <div key={d.id} className="flex items-start gap-4 rounded-md border px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          {showProgram && (
            <Link
              href={`/programs/${d.program.id}?tab=documents`}
              className="mb-1 block truncate text-xs text-muted-foreground hover:underline"
            >
              {d.program.school} · {d.program.department}
            </Link>
          )}
          <span className="block truncate font-medium">{d.title}</span>
          {d.url && (
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Open
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          {d.notes && (
            <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!showProgram && (
            <p className="text-xs text-muted-foreground">{DOCUMENT_KIND_LABEL[d.kind]}</p>
          )}
          <Select
            value={d.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: d.id, status: v })}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue>{DOCUMENT_STATUS_LABEL[d.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sort === "kind" ? (
        byKind.map(({ kind, items }) => (
          <div key={kind} className="space-y-3">
            <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL[kind]}</p>
            {items.map((d) => renderDocument(d, true))}
          </div>
        ))
      ) : (
        Object.entries(byProgram).map(([programId, { school, department, items }]) => (
          <div key={programId} className="space-y-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <Link
                href={`/programs/${programId}?tab=documents`}
                className="min-w-0 shrink truncate text-sm font-medium hover:underline"
              >
                {school}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{department}</span>
            </div>
            {items.map((d) => renderDocument(d))}
          </div>
        ))
      )}
    </div>
  );
}

function DocumentsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const kindFilter = searchParams.get("kind") ?? "all";
  const sort = searchParams.get("sort") ?? "program";
  const search = searchParams.get("q") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || (key === "sort" && value === "program")) params.delete(key);
      else params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return (
    <>
      <div className="mb-6 space-y-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
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
                  {sort === "kind" ? "By kind" : "By program"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program">By program</SelectItem>
                <SelectItem value="kind">By kind</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={(v) => v && setParam("kind", v)}>
              <SelectTrigger className="h-9 flex-1 text-sm sm:w-52 sm:flex-none">
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
              <SelectTrigger className="h-9 flex-1 text-sm sm:w-36 sm:flex-none">
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
      </div>
      <DocumentsList statusFilter={statusFilter} kindFilter={kindFilter} search={search} sort={sort} />
    </>
  );
}

function DocumentsPageSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
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
