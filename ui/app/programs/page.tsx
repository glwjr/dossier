"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Program } from "@/lib/types";
import { RequireAuth } from "@/components/require-auth";
import { ProgramDialog } from "@/components/program-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TIER_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  reach: "default",
  match: "secondary",
  likely: "outline",
};

function ProgramList() {
  const { data, isLoading, error } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">Failed to load programs.</p>;
  if (!data?.length) return <p className="text-muted-foreground">No programs yet.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((p) => (
        <Link key={p.id} href={`/programs/${p.id}`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{p.school}</CardTitle>
                <Badge variant={TIER_VARIANT[p.tier]}>{p.tier}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.department}</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {p.status}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <RequireAuth>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <ProgramDialog trigger={<Button>New program</Button>} />
      </div>
      <ProgramList />
    </RequireAuth>
  );
}
