"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Program, ProgramRecommender, ProgramAssignmentSummary } from "@/lib/types";
import { REC_STATUS_LABEL } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  recommenderId: number;
  existingAssignments: ProgramAssignmentSummary[];
  trigger: React.ReactElement;
}

export function AssignToProgramDialog({
  recommenderId,
  existingAssignments,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [programId, setProgramId] = useState<number | "">("");
  const [status, setStatus] = useState("asked");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
    enabled: open,
  });

  const assignedIds = new Set(existingAssignments.map((a) => a.program_id));
  const available = programs.filter((p) => !assignedIds.has(p.id));

  const mutation = useMutation<ProgramRecommender, Error>({
    mutationFn: () =>
      api.post(`/programs/${programId}/recommenders`, {
        recommender_id: recommenderId,
        status,
        due_date: dueDate || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      toast.success("Assigned");
      setOpen(false);
    },
    onError: () => toast.error("Something went wrong"),
  });

  function handleOpen() {
    setProgramId("");
    setStatus("asked");
    setDueDate("");
    setNotes("");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) return;
    mutation.mutate();
  }

  return (
    <>
      <span style={{ display: "contents" }} onClick={handleOpen}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select
                value={String(programId)}
                onValueChange={(v) => v && setProgramId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {programId
                      ? (programs.find((p) => p.id === programId)?.school ?? "Select…")
                      : "Select…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Already assigned to all programs
                    </div>
                  ) : (
                    available.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.school} — {p.department}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{REC_STATUS_LABEL[status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asked">Asked</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="atp-due">Due date</Label>
                <Input
                  id="atp-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="atp-notes">Notes</Label>
              <Textarea
                id="atp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !programId}>
                {mutation.isPending ? "Saving…" : "Assign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
