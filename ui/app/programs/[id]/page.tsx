"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { api } from "@/lib/api";
import {
  Deadline,
  Document,
  OutreachContact,
  Program,
  ProgramRecommender,
  Requirement,
} from "@/lib/types";
import { RequireAuth } from "@/components/require-auth";
import { ProgramDialog } from "@/components/program-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_COLOR: Record<string, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-yellow-600",
  done: "text-green-600",
  waived: "text-muted-foreground line-through",
};

const REC_STATUS_COLOR: Record<string, string> = {
  asked: "text-muted-foreground",
  confirmed: "text-yellow-600",
  submitted: "text-green-600",
};

const DOC_STATUS_COLOR: Record<string, string> = {
  draft: "text-muted-foreground",
  in_progress: "text-yellow-600",
  final: "text-green-600",
};

const RESPONSE_COLOR: Record<string, string> = {
  none: "text-muted-foreground",
  positive: "text-green-600",
  negative: "text-destructive",
  meeting_scheduled: "text-yellow-600",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span>{left}</span>
      {right && <span className="text-muted-foreground">{right}</span>}
    </div>
  );
}

function RequirementsTab({ programId }: { programId: number }) {
  const { data = [] } = useQuery<Requirement[]>({
    queryKey: ["requirements", programId],
    queryFn: () => api.get(`/programs/${programId}/requirements`),
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">None yet.</p>;
  return (
    <Section title="Requirements">
      {data.map((r) => (
        <Row
          key={r.id}
          left={<span className={STATUS_COLOR[r.status]}>{r.label}</span>}
          right={r.due_date ?? undefined}
        />
      ))}
    </Section>
  );
}

function DeadlinesTab({ programId }: { programId: number }) {
  const { data = [] } = useQuery<Deadline[]>({
    queryKey: ["deadlines", programId],
    queryFn: () => api.get(`/programs/${programId}/deadlines`),
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">None yet.</p>;
  return (
    <Section title="Deadlines">
      {data.map((d) => (
        <Row
          key={d.id}
          left={
            <span className={d.done ? "line-through text-muted-foreground" : ""}>
              {d.kind.replace("_", " ")} — {d.due_date}
            </span>
          }
          right={d.done ? "done" : undefined}
        />
      ))}
    </Section>
  );
}

function RecommendersTab({ programId }: { programId: number }) {
  const { data = [] } = useQuery<ProgramRecommender[]>({
    queryKey: ["program-recommenders", programId],
    queryFn: () => api.get(`/programs/${programId}/recommenders`),
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">None assigned yet.</p>;
  return (
    <Section title="Recommenders">
      {data.map((pr) => (
        <Row
          key={pr.id}
          left={
            <span className={REC_STATUS_COLOR[pr.status]}>
              {pr.recommender.name}
              {pr.recommender.institution ? ` — ${pr.recommender.institution}` : ""}
            </span>
          }
          right={pr.status}
        />
      ))}
    </Section>
  );
}

function OutreachTab({ programId }: { programId: number }) {
  const { data = [] } = useQuery<OutreachContact[]>({
    queryKey: ["outreach", programId],
    queryFn: () => api.get(`/programs/${programId}/outreach`),
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">None yet.</p>;
  return (
    <Section title="Faculty outreach">
      {data.map((c) => (
        <Row
          key={c.id}
          left={<span className={RESPONSE_COLOR[c.response]}>{c.name}</span>}
          right={c.contacted_on ?? undefined}
        />
      ))}
    </Section>
  );
}

function DocumentsTab({ programId }: { programId: number }) {
  const { data = [] } = useQuery<Document[]>({
    queryKey: ["documents", programId],
    queryFn: () => api.get(`/programs/${programId}/documents`),
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">None yet.</p>;
  return (
    <Section title="Documents">
      {data.map((d) => (
        <Row
          key={d.id}
          left={<span className={DOC_STATUS_COLOR[d.status]}>{d.title}</span>}
          right={d.status.replace("_", " ")}
        />
      ))}
    </Section>
  );
}

function ProgramDetail({ id }: { id: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: program, isLoading, error } = useQuery<Program>({
    queryKey: ["program", id],
    queryFn: () => api.get(`/programs/${id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/programs");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !program) return <p className="text-destructive">Program not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{program.school}</h1>
            <Badge variant="outline" className="capitalize">
              {program.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{program.department}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProgramDialog
            program={program}
            trigger={<Button variant="outline" size="sm">Edit</Button>}
          />
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="recommenders">Recommenders</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="requirements">
            <RequirementsTab programId={id} />
          </TabsContent>
          <TabsContent value="deadlines">
            <DeadlinesTab programId={id} />
          </TabsContent>
          <TabsContent value="recommenders">
            <RecommendersTab programId={id} />
          </TabsContent>
          <TabsContent value="outreach">
            <OutreachTab programId={id} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab programId={id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <div className="mb-4">
        <Link href="/programs" className="text-sm text-muted-foreground hover:text-foreground">
          ← Programs
        </Link>
      </div>
      <ProgramDetail id={Number(id)} />
    </RequireAuth>
  );
}
