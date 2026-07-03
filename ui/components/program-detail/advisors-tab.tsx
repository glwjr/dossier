"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { safeExternalUrl } from "@/lib/url";
import { Advisor } from "@/lib/types";
import { ADVISOR_RESPONSE_LABEL, formatDate } from "@/lib/display";
import { AdvisorDialog } from "@/components/advisor-dialog";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";

const RESPONSE_BORDER: Record<string, string> = {
  none: "",
  positive: "border-l-green-500",
  negative: "border-l-destructive",
  meeting_scheduled: "border-l-yellow-500",
};

export function AdvisorsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Advisor[]>({
    queryKey: queryKeys.advisors.byProgram(programId),
    queryFn: () => api.get(`/programs/${programId}/advisors`),
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => api.delete(`/advisors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.advisors.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.advisors.all });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

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
            {safeExternalUrl(c.url) && (
              <a
                href={safeExternalUrl(c.url)!}
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
            <ConfirmButton onConfirm={() => deleteContact.mutate(c.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
