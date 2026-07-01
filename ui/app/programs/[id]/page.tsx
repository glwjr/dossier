"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { use } from "react";
import { api } from "@/lib/api";
import {
  Deadline,
  Document,
  Advisor,
  Program,
  ProgramRecommender,
  Requirement,
} from "@/lib/types";
import {
  DEADLINE_KIND_LABEL,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  ADVISOR_RESPONSE_LABEL,
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
  REC_STATUS_LABEL,
  REQUIREMENT_STATUS_LABEL,
  formatDate,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { ProgramDialog } from "@/components/program-dialog";
import { RequirementDialog } from "@/components/requirement-dialog";
import { DeadlineDialog } from "@/components/deadline-dialog";
import { AssignRecommenderDialog } from "@/components/assign-recommender-dialog";
import { AdvisorDialog } from "@/components/advisor-dialog";
import { DocumentDialog } from "@/components/document-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import { usePageTitle } from "@/lib/use-page-title";

const STATUS_BORDER: Record<string, string> = {
  todo: "",
  in_progress: "border-l-yellow-500",
  done: "border-l-green-500",
  waived: "",
};

const REC_STATUS_BORDER: Record<string, string> = {
  to_ask: "",
  asked: "",
  confirmed: "border-l-yellow-500",
  submitted: "border-l-green-500",
};

const DOC_STATUS_BORDER: Record<string, string> = {
  draft: "",
  in_progress: "border-l-yellow-500",
  final: "border-l-green-500",
};

const RESPONSE_BORDER: Record<string, string> = {
  none: "",
  positive: "border-l-green-500",
  negative: "border-l-destructive",
  meeting_scheduled: "border-l-yellow-500",
};


function RequirementsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Requirement[]>({
    queryKey: ["requirements", programId],
    queryFn: () => api.get(`/programs/${programId}/requirements`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/requirements/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements", programId] });
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
    },
  });

  const deleteReq = useMutation({
    mutationFn: (id: number) => api.delete(`/requirements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements", programId] });
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const REQ_STATUS_SORT: Record<string, number> = { todo: 0, in_progress: 1, done: 2, waived: 3 };
  const sorted = [...data].sort((a, b) => {
    const diff = REQ_STATUS_SORT[a.status] - REQ_STATUS_SORT[b.status];
    if (diff !== 0) return diff;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <RequirementDialog
          programId={programId}
          trigger={<Button size="sm"><Plus />Add requirement</Button>}
        />
      </div>
      {sorted.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No requirements yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the documents, tests, and other items this program requires.</p>
        </div>
      )}
      {sorted.map((r) => (
        <div
          key={r.id}
          className={`flex items-start gap-2 rounded-md border border-l-4 px-3 py-2 text-sm ${STATUS_BORDER[r.status]}`}
        >
          <div className="min-w-0 flex-1">
            <span className={`block truncate${r.status === "waived" ? " line-through text-muted-foreground" : ""}`}>{r.label}</span>
            {r.due_date && <span className="block text-xs text-muted-foreground">{formatDate(r.due_date)}</span>}
            {r.notes && <p className="mt-0.5 text-xs text-muted-foreground">{r.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
          <Select
            value={r.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: r.id, status: v })}
          >
            <SelectTrigger className="h-7 w-28 text-xs sm:w-32">
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
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const sortedDeadlines = [...data].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DeadlineDialog
          programId={programId}
          trigger={<Button size="sm"><Plus />Add deadline</Button>}
        />
      </div>
      {sortedDeadlines.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No deadlines yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Track application, fellowship, and fee waiver deadlines.</p>
        </div>
      )}
      {sortedDeadlines.map((d) => (
        <div
          key={d.id}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm"
        >
          <button
            className={`min-w-0 flex-1 truncate text-left ${d.done ? "line-through text-muted-foreground" : ""}`}
            onClick={() => toggleDone.mutate(d)}
          >
            {DEADLINE_KIND_LABEL[d.kind]} — {formatDate(d.due_date)}
          </button>
          <div className="ml-auto flex items-center gap-1">
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
          {d.notes && (
            <p className="w-full text-xs text-muted-foreground">{d.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RecommendersTab({
  programId,
  requiredLetters,
}: {
  programId: number;
  requiredLetters: number | null;
}) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<ProgramRecommender[]>({
    queryKey: ["program-recommenders", programId],
    queryFn: () => api.get(`/programs/${programId}/recommenders`),
  });

  const submittedCount = data.filter((a) => a.status === "submitted").length;
  const shortBy =
    requiredLetters != null ? Math.max(requiredLetters - data.length, 0) : 0;

  const removeAssignment = useMutation({
    mutationFn: (recommenderId: number) =>
      api.delete(`/programs/${programId}/recommenders/${recommenderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-recommenders", programId] });
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      toast.success("Removed");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {requiredLetters != null ? (
          <p className="text-sm text-muted-foreground">
            {submittedCount} of {requiredLetters} letters submitted
            {shortBy > 0 && (
              <span className="text-yellow-600 dark:text-yellow-500">
                {" "}
                · {shortBy} more to assign
              </span>
            )}
          </p>
        ) : (
          <span />
        )}
        <AssignRecommenderDialog
          programId={programId}
          trigger={<Button size="sm">Assign recommender</Button>}
        />
      </div>
      {data.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No recommenders assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">Assign letter writers and track their status for this program.</p>
        </div>
      )}
      {data.map((pr) => (
        <div
          key={pr.id}
          className={`flex items-start gap-2 rounded-md border border-l-4 px-3 py-2 text-sm ${REC_STATUS_BORDER[pr.status]}`}
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate">
              {pr.recommender.name}
              {pr.recommender.institution ? ` — ${pr.recommender.institution}` : ""}
            </span>
            <span className="block text-xs text-muted-foreground">
              {REC_STATUS_LABEL[pr.status]}
              {pr.due_date ? ` · ${formatDate(pr.due_date)}` : ""}
            </span>
            {pr.notes && <p className="mt-0.5 text-xs text-muted-foreground">{pr.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
        </div>
      ))}
    </div>
  );
}

function AdvisorsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Advisor[]>({
    queryKey: ["advisors", programId],
    queryFn: () => api.get(`/programs/${programId}/advisors`),
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => api.delete(`/advisors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisors", programId] });
      queryClient.invalidateQueries({ queryKey: ["advisors-all"] });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AdvisorDialog
          programId={programId}
          trigger={<Button size="sm"><Plus />Add advisor</Button>}
        />
      </div>
      {data.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No advisors yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Track potential faculty advisors, their research, and any outreach.</p>
        </div>
      )}
      {data.map((c) => (
        <div
          key={c.id}
          className={`flex items-start gap-2 rounded-md border border-l-4 px-3 py-2 text-sm ${RESPONSE_BORDER[c.response]}`}
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate">{c.name}</span>
            {c.research_area && (
              <span className="block truncate text-xs text-muted-foreground">{c.research_area}</span>
            )}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                Profile
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
            <span className="mt-1 block text-xs text-muted-foreground">
              {ADVISOR_RESPONSE_LABEL[c.response]}
              {c.contacted_on ? ` · ${formatDate(c.contacted_on)}` : ""}
            </span>
            {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AdvisorDialog
              programId={programId}
              contact={c}
              trigger={
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  Edit
                </Button>
              }
            />
            {confirmDelete === c.id ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    deleteContact.mutate(c.id);
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
                onClick={() => setConfirmDelete(c.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Document[]>({
    queryKey: ["documents", programId],
    queryFn: () => api.get(`/programs/${programId}/documents`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DocumentDialog
          programId={programId}
          trigger={<Button size="sm"><Plus />Add document</Button>}
        />
      </div>
      {data.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Link your SOPs, CVs, and writing samples to this program.</p>
        </div>
      )}
      {data.map((d) => (
        <div
          key={d.id}
          className={`flex items-start gap-4 rounded-md border border-l-4 px-3 py-2 text-sm ${DOC_STATUS_BORDER[d.status]}`}
        >
          <div className="min-w-0 flex-1">
            {d.url ? (
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 underline underline-offset-2 hover:opacity-70"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="min-w-0 truncate">{d.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="block truncate">{d.title}</span>
            )}
            <span className="block text-xs text-muted-foreground">{DOCUMENT_KIND_LABEL[d.kind]}</span>
            {d.notes && <p className="mt-0.5 text-xs text-muted-foreground">{d.notes}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-1">
          <div className="flex items-center gap-1">
            <DocumentDialog
              programId={programId}
              document={d}
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
                    deleteDoc.mutate(d.id);
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
          <Select
            value={d.status}
            onValueChange={(v) =>
              v && updateStatus.mutate({ id: d.id, status: v })
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs sm:w-32">
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
      ))}
    </div>
  );
}

const VALID_TABS = ["requirements", "deadlines", "recommenders", "advisors", "documents"];

const TAB_LABEL: Record<string, string> = {
  requirements: "Requirements",
  deadlines: "Deadlines",
  recommenders: "Recommenders",
  advisors: "Advisors",
  documents: "Documents",
};

function ProgramDetail({ id }: { id: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeTab = VALID_TABS.includes(searchParams.get("tab") ?? "")
    ? (searchParams.get("tab") as string)
    : "requirements";

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "requirements") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const { data: program, isLoading, error } = useQuery<Program>({
    queryKey: ["program", id],
    queryFn: () => api.get(`/programs/${id}`),
  });

  const { data: requirements = [] } = useQuery<Requirement[]>({
    queryKey: ["requirements", id],
    queryFn: () => api.get(`/programs/${id}/requirements`),
    enabled: !!program,
  });
  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: ["deadlines", id],
    queryFn: () => api.get(`/programs/${id}/deadlines`),
    enabled: !!program,
  });
  const { data: programRecommenders = [] } = useQuery<ProgramRecommender[]>({
    queryKey: ["program-recommenders", id],
    queryFn: () => api.get(`/programs/${id}/recommenders`),
    enabled: !!program,
  });
  const { data: advisors = [] } = useQuery<Advisor[]>({
    queryKey: ["advisors", id],
    queryFn: () => api.get(`/programs/${id}/advisors`),
    enabled: !!program,
  });
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["documents", id],
    queryFn: () => api.get(`/programs/${id}/documents`),
    enabled: !!program,
  });
  const applicationDeadline = [...deadlines]
    .filter((d) => d.kind === "application")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  usePageTitle(program ? program.school : "Program");

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/programs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program", id] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Program deleted");
      router.push("/programs");
    },
    onError: onMutationError,
  });

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  if (error || !program)
    return (
      <ErrorState
        title="Program not found"
        message="It may have been deleted, or you may not have access."
        backHref="/programs"
        backLabel="Back to programs"
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{program.school}</h1>
            <Badge variant={PROGRAM_TIER_VARIANT[program.tier]}>
              {PROGRAM_TIER_LABEL[program.tier]}
            </Badge>
            <Select value={program.status} onValueChange={(v) => v && updateStatus.mutate(v)}>
              <SelectTrigger className="h-7 w-auto min-w-24 border-dashed px-2 text-xs font-normal">
                <SelectValue>{PROGRAM_STATUS_LABEL[program.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="researching">Researching</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-1 text-muted-foreground">{program.department}</p>
          {program.location && (
            <p className="mt-0.5 text-sm text-muted-foreground">{program.location}</p>
          )}
          <div className="mt-2 text-sm text-muted-foreground">
            {(program.app_fee != null || program.stipend != null || applicationDeadline || program.decision_deadline) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 [&>span~span]:before:mr-2 [&>span~span]:before:text-muted-foreground/50 [&>span~span]:before:content-['·']">
                {program.app_fee != null && <span>${program.app_fee} fee</span>}
                {program.stipend != null && <span>${program.stipend.toLocaleString()}/yr stipend</span>}
                {applicationDeadline && (
                  <span>Apply by {formatDate(applicationDeadline.due_date)}</span>
                )}
                {program.decision_deadline && (
                  <span>Reply by {formatDate(program.decision_deadline)}</span>
                )}
              </div>
            )}
            {program.url && (
              <a
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-70"
              >
                Program website
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
          {program.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{program.notes}</p>
          )}
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

      <Tabs value={activeTab} onValueChange={setTab}>
        {/* Mobile: select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={(v) => v && setTab(v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{TAB_LABEL[activeTab]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requirements">
                Requirements{requirements.length > 0 && ` (${requirements.length})`}
              </SelectItem>
              <SelectItem value="deadlines">
                Deadlines{deadlines.length > 0 && ` (${deadlines.length})`}
              </SelectItem>
              <SelectItem value="recommenders">
                Recommenders{programRecommenders.length > 0 && ` (${programRecommenders.length})`}
              </SelectItem>
              <SelectItem value="advisors">
                Advisors{advisors.length > 0 && ` (${advisors.length})`}
              </SelectItem>
              <SelectItem value="documents">
                Documents{documents.length > 0 && ` (${documents.length})`}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Desktop: tab bar */}
        <div className="hidden sm:block">
          <TabsList>
            <TabsTrigger value="requirements">
              Requirements{requirements.length > 0 && ` (${requirements.length})`}
            </TabsTrigger>
            <TabsTrigger value="deadlines">
              Deadlines{deadlines.length > 0 && ` (${deadlines.length})`}
            </TabsTrigger>
            <TabsTrigger value="recommenders">
              Recommenders{programRecommenders.length > 0 && ` (${programRecommenders.length})`}
            </TabsTrigger>
            <TabsTrigger value="advisors">
              Advisors{advisors.length > 0 && ` (${advisors.length})`}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents{documents.length > 0 && ` (${documents.length})`}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-4">
          <TabsContent value="requirements">
            <RequirementsTab programId={id} />
          </TabsContent>
          <TabsContent value="deadlines">
            <DeadlinesTab programId={id} />
          </TabsContent>
          <TabsContent value="recommenders">
            <RecommendersTab programId={id} requiredLetters={program.required_letters} />
          </TabsContent>
          <TabsContent value="advisors">
            <AdvisorsTab programId={id} />
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
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        }
      >
        <ProgramDetail id={Number(id)} />
      </Suspense>
    </RequireAuth>
  );
}
