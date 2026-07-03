"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { use } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { safeExternalUrl } from "@/lib/url";
import {
  Deadline,
  Document,
  Advisor,
  Program,
  ProgramRecommender,
  Requirement,
} from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  PROGRAM_TIER_VARIANT,
  formatDate,
} from "@/lib/display";
import { RequireAuth } from "@/components/require-auth";
import { ErrorState } from "@/components/error-state";
import { ProgramDialog } from "@/components/program-dialog";
import { RequirementsTab } from "@/components/program-detail/requirements-tab";
import { DeadlinesTab } from "@/components/program-detail/deadlines-tab";
import { RecommendersTab } from "@/components/program-detail/recommenders-tab";
import { AdvisorsTab } from "@/components/program-detail/advisors-tab";
import { DocumentsTab } from "@/components/program-detail/documents-tab";
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
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import { usePageTitle } from "@/lib/use-page-title";

const VALID_TABS = ["requirements", "deadlines", "recommenders", "advisors", "documents"];

const TAB_LABEL: Record<string, string> = {
  requirements: "Requirements",
  deadlines: "Deadlines",
  recommenders: "Recommenders",
  advisors: "Advisors",
  documents: "Documents",
};

function ProgramDetailSkeleton() {
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
}

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
    queryKey: queryKeys.programs.detail(id),
    queryFn: () => api.get(`/programs/${id}`),
  });

  const { data: requirements = [] } = useQuery<Requirement[]>({
    queryKey: queryKeys.requirements.byProgram(id),
    queryFn: () => api.get(`/programs/${id}/requirements`),
    enabled: !!program,
  });
  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: queryKeys.deadlines.byProgram(id),
    queryFn: () => api.get(`/programs/${id}/deadlines`),
    enabled: !!program,
  });
  const { data: programRecommenders = [] } = useQuery<ProgramRecommender[]>({
    queryKey: queryKeys.recommenders.byProgram(id),
    queryFn: () => api.get(`/programs/${id}/recommenders`),
    enabled: !!program,
  });
  const { data: advisors = [] } = useQuery<Advisor[]>({
    queryKey: queryKeys.advisors.byProgram(id),
    queryFn: () => api.get(`/programs/${id}/advisors`),
    enabled: !!program,
  });
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: queryKeys.documents.byProgram(id),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: onMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success("Program deleted");
      router.push("/programs");
    },
    onError: onMutationError,
  });

  if (isLoading) return <ProgramDetailSkeleton />;
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-2xl font-semibold">{program.school}</h1>
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
            {(program.app_fee != null || program.stipend != null || applicationDeadline || program.decision_deadline || program.interview_date) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 [&>span~span]:before:mr-2 [&>span~span]:before:text-muted-foreground/50 [&>span~span]:before:content-['·']">
                {program.app_fee != null && <span>${program.app_fee} fee</span>}
                {program.stipend != null && <span>${program.stipend.toLocaleString()}/yr stipend</span>}
                {applicationDeadline && (
                  <span>Apply by {formatDate(applicationDeadline.due_date)}</span>
                )}
                {program.decision_deadline && (
                  <span>Reply by {formatDate(program.decision_deadline)}</span>
                )}
                {program.interview_date && (
                  <span>Interview {formatDate(program.interview_date)}</span>
                )}
              </div>
            )}
            {safeExternalUrl(program.url) && (
              <a
                href={safeExternalUrl(program.url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-70"
              >
                Program website
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
          {program.interview_notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Interview:</span>{" "}
              {program.interview_notes}
            </p>
          )}
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
      <Suspense fallback={<ProgramDetailSkeleton />}>
        <ProgramDetail id={Number(id)} />
      </Suspense>
    </RequireAuth>
  );
}
