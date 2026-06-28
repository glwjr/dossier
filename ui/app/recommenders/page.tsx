"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recommender } from "@/lib/types";
import { REC_STATUS_LABEL } from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { RecommenderDialog } from "@/components/recommender-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  asked: "outline",
  confirmed: "secondary",
  submitted: "default",
};

function RecommenderList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
  });

  const deleteRec = useMutation({
    mutationFn: (id: number) => api.delete(`/recommenders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Something went wrong"),
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
    return <p className="text-destructive">Failed to load recommenders.</p>;
  if (!data?.length)
    return <p className="text-muted-foreground">No recommenders yet.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{r.name}</CardTitle>
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
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1 text-muted-foreground">
              {r.institution && <p>{r.institution}</p>}
              {r.email && (
                <a
                  href={`mailto:${r.email}`}
                  className="hover:text-foreground underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.email}
                </a>
              )}
              {r.notes && <p className="text-foreground">{r.notes}</p>}
            </div>

            {r.program_assignments.length > 0 && (
              <div className="space-y-1.5">
                {r.program_assignments.map((a) => (
                  <div key={a.program_id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/programs/${a.program_id}`}
                      className="min-w-0 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {a.program.school} — {a.program.department}
                    </Link>
                    <Badge
                      variant={STATUS_VARIANT[a.status]}
                      className="shrink-0 text-xs"
                    >
                      {REC_STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function RecommendersPage() {
  return (
    <RequireAuth>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recommenders</h1>
        <RecommenderDialog trigger={<Button>Add recommender</Button>} />
      </div>
      <RecommenderList />
    </RequireAuth>
  );
}
