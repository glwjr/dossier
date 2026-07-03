"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Deadline } from "@/lib/types";
import { DEADLINE_KIND_LABEL, formatDate } from "@/lib/display";
import { DeadlineDialog } from "@/components/deadline-dialog";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";

export function DeadlinesTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Deadline[]>({
    queryKey: queryKeys.deadlines.byProgram(programId),
    queryFn: () => api.get(`/programs/${programId}/deadlines`),
  });

  const toggleDone = useMutation({
    mutationFn: (d: Deadline) =>
      api.patch(`/deadlines/${d.id}`, { done: !d.done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });

  const deleteDeadline = useMutation({
    mutationFn: (id: number) => api.delete(`/deadlines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

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
            <ConfirmButton onConfirm={() => deleteDeadline.mutate(d.id)} />
          </div>
          {d.notes && (
            <p className="w-full text-xs text-muted-foreground">{d.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
