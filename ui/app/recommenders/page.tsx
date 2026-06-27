"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recommender } from "@/lib/types";
import { RequireAuth } from "@/components/require-auth";
import { RecommenderDialog } from "@/components/recommender-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function RecommenderList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
  });

  const deleteRec = useMutation({
    mutationFn: (id: number) => api.delete(`/recommenders/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recommenders"] }),
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
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
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {r.institution && <p>{r.institution}</p>}
            {r.email && <p>{r.email}</p>}
            {r.notes && <p className="mt-2 text-foreground">{r.notes}</p>}
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
