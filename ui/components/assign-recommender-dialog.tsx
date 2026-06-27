"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ProgramRecommender,
  ProgramRecommenderCreate,
  ProgramRecommenderUpdate,
  Recommender,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  programId: number;
  assignment?: ProgramRecommender;
  trigger: React.ReactElement;
}

const STATUS_OPTIONS = [
  { value: "asked", label: "Asked" },
  { value: "confirmed", label: "Confirmed" },
  { value: "submitted", label: "Submitted" },
];

export function AssignRecommenderDialog({
  programId,
  assignment,
  trigger,
}: Props) {
  const isEdit = !!assignment;
  const [open, setOpen] = useState(false);
  const [recommenderId, setRecommenderId] = useState<number | "">(
    assignment?.recommender_id ?? ""
  );
  const [status, setStatus] = useState(assignment?.status ?? "asked");
  const [dueDate, setDueDate] = useState(assignment?.due_date ?? "");
  const [notes, setNotes] = useState(assignment?.notes ?? "");
  const queryClient = useQueryClient();

  const { data: recommenders = [] } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
    enabled: open,
  });

  const mutation = useMutation<
    ProgramRecommender,
    Error,
    ProgramRecommenderCreate | ProgramRecommenderUpdate
  >({
    mutationFn: (data) =>
      isEdit
        ? api.patch<ProgramRecommender>(
            `/programs/${programId}/recommenders/${assignment.recommender_id}`,
            data
          )
        : api.post<ProgramRecommender>(
            `/programs/${programId}/recommenders`,
            data
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["program-recommenders", programId],
      });
      setOpen(false);
    },
  });

  function handleOpen() {
    setRecommenderId(assignment?.recommender_id ?? "");
    setStatus(assignment?.status ?? "asked");
    setDueDate(assignment?.due_date ?? "");
    setNotes(assignment?.notes ?? "");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(isEdit ? {} : { recommender_id: recommenderId as number }),
      status,
      due_date: dueDate || null,
      notes: notes || null,
    };
    mutation.mutate(payload);
  }

  return (
    <>
      <span style={{ display: "contents" }} onClick={handleOpen}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit assignment" : "Assign recommender"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Recommender</Label>
                <Select
                  value={String(recommenderId)}
                  onValueChange={(v) => v && setRecommenderId(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {recommenderId
                        ? (recommenders.find((r) => r.id === recommenderId)?.name ?? "Select…")
                        : "Select…"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {recommenders.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                        {r.institution ? ` — ${r.institution}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) =>
                    v && setStatus(v as ProgramRecommenderCreate["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-due">Due date</Label>
                <Input
                  id="assign-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea
                id="assign-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {mutation.error && (
              <p className="text-sm text-destructive">
                {mutation.error.message}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || (!isEdit && !recommenderId)}
              >
                {mutation.isPending ? "Saving…" : isEdit ? "Save" : "Assign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
