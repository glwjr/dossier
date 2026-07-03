"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Requirement } from "@/lib/types";
import { REQUIREMENT_STATUS_LABEL, formatDate } from "@/lib/display";
import { RequirementDialog } from "@/components/requirement-dialog";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";

const STATUS_BORDER: Record<string, string> = {
  todo: "",
  in_progress: "border-l-yellow-500",
  done: "border-l-green-500",
  waived: "",
};

const REQ_STATUS_SORT: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  waived: 3,
};

export function RequirementsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Requirement[]>({
    queryKey: queryKeys.requirements.byProgram(programId),
    queryFn: () => api.get(`/programs/${programId}/requirements`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/requirements/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
    },
  });

  const deleteReq = useMutation({
    mutationFn: (id: number) => api.delete(`/requirements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

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
        <EmptyState
          title="No requirements yet"
          message="Add the documents, tests, and other items this program requires."
        />
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
          <ConfirmButton onConfirm={() => deleteReq.mutate(r.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
