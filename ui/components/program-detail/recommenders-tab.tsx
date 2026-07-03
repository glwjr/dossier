"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { ProgramRecommender } from "@/lib/types";
import { REC_STATUS_LABEL, formatDate } from "@/lib/display";
import { AssignRecommenderDialog } from "@/components/assign-recommender-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";

const REC_STATUS_BORDER: Record<string, string> = {
  to_ask: "",
  asked: "",
  confirmed: "border-l-yellow-500",
  submitted: "border-l-green-500",
};

export function RecommendersTab({
  programId,
  requiredLetters,
}: {
  programId: number;
  requiredLetters: number | null;
}) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<ProgramRecommender[]>({
    queryKey: queryKeys.recommenders.byProgram(programId),
    queryFn: () => api.get(`/programs/${programId}/recommenders`),
  });

  const submittedCount = data.filter((a) => a.status === "submitted").length;
  const shortBy =
    requiredLetters != null ? Math.max(requiredLetters - data.length, 0) : 0;

  const removeAssignment = useMutation({
    mutationFn: (recommenderId: number) =>
      api.delete(`/programs/${programId}/recommenders/${recommenderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommenders.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommenders.root });
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
