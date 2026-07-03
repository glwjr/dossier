"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { safeExternalUrl } from "@/lib/url";
import { Document } from "@/lib/types";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/lib/display";
import { DocumentDialog } from "@/components/document-dialog";
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
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";

const DOC_STATUS_BORDER: Record<string, string> = {
  draft: "",
  in_progress: "border-l-yellow-500",
  final: "border-l-green-500",
};

export function DocumentsTab({ programId }: { programId: number }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery<Document[]>({
    queryKey: queryKeys.documents.byProgram(programId),
    queryFn: () => api.get(`/programs/${programId}/documents`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      toast.success("Deleted");
    },
    onError: onMutationError,
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DocumentDialog
          programId={programId}
          trigger={<Button size="sm"><Plus />Add document</Button>}
        />
      </div>
      {data.length === 0 && (
        <EmptyState
          title="No documents yet"
          message="Link your SOPs, CVs, and writing samples to this program."
        />
      )}
      {data.map((d) => (
        <div
          key={d.id}
          className={`flex items-start gap-4 rounded-md border border-l-4 px-3 py-2 text-sm ${DOC_STATUS_BORDER[d.status]}`}
        >
          <div className="min-w-0 flex-1">
            {safeExternalUrl(d.url) ? (
              <a
                href={safeExternalUrl(d.url)!}
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
            <ConfirmButton onConfirm={() => deleteDoc.mutate(d.id)} />
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
