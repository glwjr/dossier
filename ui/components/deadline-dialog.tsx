"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Deadline, DeadlineCreate } from "@/lib/types";
import { DEADLINE_KIND_LABEL } from "@/lib/display";
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
  programId: number;
  deadline?: Deadline;
  trigger: React.ReactElement;
}

const EMPTY: DeadlineCreate = {
  kind: "application",
  due_date: "",
  done: false,
  notes: "",
};

function fromDeadline(d: Deadline): DeadlineCreate {
  return {
    kind: d.kind,
    due_date: d.due_date,
    done: d.done,
    notes: d.notes ?? "",
  };
}

export function DeadlineDialog({ programId, deadline, trigger }: Props) {
  const isEdit = !!deadline;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeadlineCreate>(
    deadline ? fromDeadline(deadline) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<Deadline, Error, DeadlineCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Deadline>(`/deadlines/${deadline.id}`, data)
        : api.post<Deadline>(`/programs/${programId}/deadlines`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: () => toast.error("Something went wrong"),
  });

  function set<K extends keyof DeadlineCreate>(
    key: K,
    value: DeadlineCreate[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(deadline ? fromDeadline(deadline) : EMPTY);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ ...form, notes: form.notes || null });
  }

  return (
    <>
      <span style={{ display: "contents" }} onClick={handleOpen}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit deadline" : "Add deadline"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    v && set("kind", v as DeadlineCreate["kind"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{DEADLINE_KIND_LABEL[form.kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="fellowship">Fellowship</SelectItem>
                    <SelectItem value="fee_waiver">Fee waiver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dl-notes">Notes</Label>
              <Textarea
                id="dl-notes"
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : isEdit ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
