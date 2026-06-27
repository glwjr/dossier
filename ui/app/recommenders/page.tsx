"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recommender } from "@/lib/types";
import { RequireAuth } from "@/components/require-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RecommenderList() {
  const { data, isLoading, error } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">Failed to load recommenders.</p>;
  if (!data?.length) return <p className="text-muted-foreground">No recommenders yet.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">{r.name}</CardTitle>
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
      <h1 className="mb-6 text-2xl font-semibold">Recommenders</h1>
      <RecommenderList />
    </RequireAuth>
  );
}
