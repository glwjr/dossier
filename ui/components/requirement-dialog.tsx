"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Requirement, RequirementCreate } from "@/lib/types";
import { REQUIREMENT_KIND_LABEL, REQUIREMENT_STATUS_LABEL } from "@/lib/display";
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
  requirement?: Requirement;
  trigger: React.ReactElement;
}

const EMPTY: RequirementCreate = {
  label: "",
  kind: "other",
  status: "todo",
  due_date: "",
  notes: "",
};

function fromRequirement(r: Requirement): RequirementCreate {
  return {
    label: r.label,
    kind: r.kind as RequirementCreate["kind"],
    status: r.status as RequirementCreate["status"],
    due_date: r.due_date ?? "",
    notes: r.notes ?? "",
  };
}

export function RequirementDialog({ programId, requirement, trigger }: Props) {
  const isEdit = !!requirement;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RequirementCreate>(
    requirement ? fromRequirement(requirement) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<Requirement, Error, RequirementCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Requirement>(`/requirements/${requirement.id}`, data)
        : api.post<Requirement>(`/programs/${programId}/requirements`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements", programId] });
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: () => toast.error("Something went wrong"),
  });

  function set<K extends keyof RequirementCreate>(
    key: K,
    value: RequirementCreate[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(requirement ? fromRequirement(requirement) : EMPTY);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
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
              {isEdit ? "Edit requirement" : "Add requirement"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    set("kind", v as RequirementCreate["kind"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{REQUIREMENT_KIND_LABEL[form.kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">SOP</SelectItem>
                    <SelectItem value="cv">CV</SelectItem>
                    <SelectItem value="transcript">Transcript</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                    <SelectItem value="writing_sample">Writing sample</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    set("status", v as RequirementCreate["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{REQUIREMENT_STATUS_LABEL[form.status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value)}
                className="appearance-none sm:appearance-auto"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-notes">Notes</Label>
              <Textarea
                id="req-notes"
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
