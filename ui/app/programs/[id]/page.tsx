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
import {
  DEADLINE_KIND_LABEL,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  OUTREACH_RESPONSE_LABEL,
  PROGRAM_STATUS_LABEL,
  REC_STATUS_LABEL,
  REQUIREMENT_STATUS_LABEL,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ProgramDialog } from "@/components/program-dialog";
import { RequirementDialog } from "@/components/requirement-dialog";
import { DeadlineDialog } from "@/components/deadline-dialog";
import { AssignRecommenderDialog } from "@/components/assign-recommender-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Requirement[]>({
    queryKey: ["requirements", programId],
    queryFn: () => api.get(`/programs/${programId}/requirements`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/requirements/${id}`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["requirements", programId] }),
  });

  const deleteReq = useMutation({
    mutationFn: (id: number) => api.delete(`/requirements/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["requirements", programId] }),
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <RequirementDialog
          programId={programId}
          trigger={<Button size="sm">Add requirement</Button>}
        />
      </div>
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}
      {data.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <span className={`flex-1 ${STATUS_COLOR[r.status]}`}>{r.label}</span>
          <span className="text-xs text-muted-foreground">{r.due_date}</span>
          <Select
            value={r.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: r.id, status: v })}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue>{REQUIREMENT_STATUS_LABEL[r.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
          <RequirementDialog
            programId={programId}
            requirement={r}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Edit
              </Button>
            }
          />
          {confirmDelete === r.id ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  deleteReq.mutate(r.id);
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
            </div>
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
      ))}
    </div>
  );
}

function DeadlinesTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Deadline[]>({
    queryKey: ["deadlines", programId],
    queryFn: () => api.get(`/programs/${programId}/deadlines`),
  });

  const toggleDone = useMutation({
    mutationFn: (d: Deadline) =>
      api.patch(`/deadlines/${d.id}`, { done: !d.done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteDeadline = useMutation({
    mutationFn: (id: number) => api.delete(`/deadlines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DeadlineDialog
          programId={programId}
          trigger={<Button size="sm">Add deadline</Button>}
        />
      </div>
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}
      {data.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <button
            className={`flex-1 text-left ${d.done ? "line-through text-muted-foreground" : ""}`}
            onClick={() => toggleDone.mutate(d)}
          >
            {DEADLINE_KIND_LABEL[d.kind]} — {d.due_date}
          </button>
          <DeadlineDialog
            programId={programId}
            deadline={d}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Edit
              </Button>
            }
          />
          {confirmDelete === d.id ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  deleteDeadline.mutate(d.id);
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
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setConfirmDelete(d.id)}
            >
              Delete
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function RecommendersTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<ProgramRecommender[]>({
    queryKey: ["program-recommenders", programId],
    queryFn: () => api.get(`/programs/${programId}/recommenders`),
  });

  const removeAssignment = useMutation({
    mutationFn: (recommenderId: number) =>
      api.delete(`/programs/${programId}/recommenders/${recommenderId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["program-recommenders", programId],
      }),
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AssignRecommenderDialog
          programId={programId}
          trigger={<Button size="sm">Assign recommender</Button>}
        />
      </div>
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">None assigned yet.</p>
      )}
      {data.map((pr) => (
        <div
          key={pr.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <span className={`flex-1 ${REC_STATUS_COLOR[pr.status]}`}>
            {pr.recommender.name}
            {pr.recommender.institution
              ? ` — ${pr.recommender.institution}`
              : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {REC_STATUS_LABEL[pr.status]}
          </span>
          <AssignRecommenderDialog
            programId={programId}
            assignment={pr}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Edit
              </Button>
            }
          />
          {confirmDelete === pr.recommender_id ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  removeAssignment.mutate(pr.recommender_id);
                  setConfirmDelete(null);
                }}
              >
                Remove
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setConfirmDelete(pr.recommender_id)}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
    </div>
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
          right={OUTREACH_RESPONSE_LABEL[c.response]}
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
          right={DOCUMENT_STATUS_LABEL[d.status]}
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
            <Badge variant="outline">
              {PROGRAM_STATUS_LABEL[program.status]}
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
