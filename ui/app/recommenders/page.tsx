"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recommender } from "@/lib/types";
import { REC_STATUS_LABEL, formatDate } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { RecommenderDialog } from "@/components/recommender-dialog";
import { AssignToProgramDialog } from "@/components/assign-to-program-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import { usePageTitle } from "@/lib/use-page-title";


function RecommenderList({ statusFilter, search }: { statusFilter: string; search: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
  });

  const updateAssignmentStatus = useMutation({
    mutationFn: ({
      programId,
      recommenderId,
      status,
    }: {
      programId: number;
      recommenderId: number;
      status: string;
    }) =>
      api.patch(`/programs/${programId}/recommenders/${recommenderId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      toast.success("Status updated");
    },
    onError: onMutationError,
  });

  const deleteRec = useMutation({
    mutationFn: (id: number) => api.delete(`/recommenders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-7 w-14" />
              </div>
            </div>
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    );
  if (error)
    return <ErrorState title="Failed to load recommenders" message="Something went wrong. Try refreshing the page." />;
  if (!data?.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">No recommenders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the people writing your letters and track their status per program.
        </p>
        <RecommenderDialog
          trigger={
            <button className="mt-4 text-sm underline underline-offset-4">
              Add your first recommender →
            </button>
          }
        />
      </div>
    );

  const pending = data.flatMap((r) =>
    r.program_assignments
      .filter((a) => a.status !== "submitted")
      .map((a) => ({ rec: r, assignment: a }))
  );

  const q = search.toLowerCase();
  const filtered = data
    .filter((r) =>
      statusFilter === "all" || r.program_assignments.some((a) => a.status === statusFilter)
    )
    .filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.institution ?? "").toLowerCase().includes(q)
    );

  if (filtered.length === 0)
    return <p className="text-muted-foreground">No recommenders match the current filter.</p>;

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3">
          <p className="mb-2 text-sm font-medium">Pending letters ({pending.length})</p>
          <div className="space-y-1">
            {pending.map(({ rec, assignment }) => (
              <div key={`${rec.id}-${assignment.program_id}`} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="shrink-0 font-medium">{rec.name}</span>
                <span className="truncate text-muted-foreground">
                  <Link href={`/programs/${assignment.program_id}?tab=recommenders`} className="hover:underline">
                    {assignment.program.school}
                  </Link>
                  {" · "}
                  {REC_STATUS_LABEL[assignment.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{r.name}</CardTitle>
                {r.email && (
                  <a
                    href={`mailto:${r.email}`}
                    className="mt-0.5 block text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.email}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <RecommenderDialog
                  recommender={r}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      Edit
                    </Button>
                  }
                />
                {confirmDelete === r.id ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        deleteRec.mutate(r.id);
                        setConfirmDelete(null);
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setConfirmDelete(r.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="space-y-1 text-muted-foreground">
              {r.institution && <p>{r.institution}</p>}
              {r.notes && <p className="text-foreground">{r.notes}</p>}
            </div>

            <div className="space-y-4">
              {r.program_assignments.map((a) => (
                  <div key={a.program_id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/programs/${a.program_id}`}
                        className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {a.program.school} — {a.program.department}
                      </Link>
                      {a.due_date && (
                        <p className="text-xs text-muted-foreground/60">{formatDate(a.due_date)}</p>
                      )}
                    </div>
                    <Select
                      value={a.status}
                      onValueChange={(v) =>
                        v &&
                        updateAssignmentStatus.mutate({
                          programId: a.program_id,
                          recommenderId: r.id,
                          status: v,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 w-28 shrink-0 text-xs">
                        <SelectValue>{REC_STATUS_LABEL[a.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_ask">To ask</SelectItem>
                        <SelectItem value="asked">Asked</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              <AssignToProgramDialog
                recommenderId={r.id}
                existingAssignments={r.program_assignments}
                trigger={
                  <Button variant="outline" size="sm" className="h-7 w-full text-xs">
                    + Assign to program
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}

export default function RecommendersPage() {
  usePageTitle("Recommenders");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <RequireAuth>
      <div className="mb-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Recommenders</h1>
          <RecommenderDialog trigger={<Button><Plus />Add recommender</Button>} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm sm:flex-1"
          />
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-36">
              <SelectValue>
                {statusFilter === "all" ? "All statuses" : REC_STATUS_LABEL[statusFilter as keyof typeof REC_STATUS_LABEL]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="to_ask">To ask</SelectItem>
              <SelectItem value="asked">Asked</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <RecommenderList statusFilter={statusFilter} search={search} />
    </RequireAuth>
  );
}
