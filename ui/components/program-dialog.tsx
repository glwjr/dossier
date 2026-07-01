"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Program, ProgramCreate } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
} from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
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
  program?: Program;
  trigger: React.ReactElement;
  onSuccess?: (program: Program) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EMPTY: ProgramCreate = {
  school: "",
  department: "",
  degree: "PhD",
  url: "",
  location: "",
  tier: "reach",
  status: "researching",
  app_fee: undefined,
  stipend: undefined,
  decision_deadline: "",
  notes: "",
};

function fromProgram(p: Program): ProgramCreate {
  return {
    school: p.school,
    department: p.department,
    degree: p.degree,
    url: p.url ?? "",
    tier: p.tier,
    status: p.status,
    app_fee: p.app_fee ?? undefined,
    stipend: p.stipend ?? undefined,
    decision_deadline: p.decision_deadline ?? "",
    location: p.location ?? "",
    notes: p.notes ?? "",
  };
}

export function ProgramDialog({ program, trigger, onSuccess, open: controlledOpen, onOpenChange }: Props) {
  const isEdit = !!program;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [form, setForm] = useState<ProgramCreate>(
    program ? fromProgram(program) : EMPTY
  );
  const [withDefaults, setWithDefaults] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation<Program, Error, ProgramCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Program>(`/programs/${program.id}`, data)
        : api.post<Program>(
            `/programs${withDefaults ? "?with_default_requirements=true" : ""}`,
            data
          ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["program", result.id] });
      queryClient.invalidateQueries({ queryKey: ["requirements", result.id] });
      queryClient.invalidateQueries({ queryKey: ["requirements-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(isEdit ? "Program updated" : "Program created");
      setOpen(false);
      onSuccess?.(result);
    },
    onError: onMutationError,
  });

  function set<K extends keyof ProgramCreate>(key: K, value: ProgramCreate[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(program ? fromProgram(program) : EMPTY);
    setWithDefaults(true);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      url: form.url || null,
      location: form.location || null,
      notes: form.notes || null,
      app_fee: form.app_fee ?? null,
      stipend: form.stipend ?? null,
      decision_deadline: form.decision_deadline || null,
    });
  }

  return (
    <>
      <span style={{ display: "contents" }} onClick={handleOpen}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit program" : "New program"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={form.school}
                  onChange={(e) => set("school", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="degree">Degree</Label>
                <Input
                  id="degree"
                  value={form.degree}
                  onChange={(e) => set("degree", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(v) =>
                    set("tier", v as ProgramCreate["tier"])
                  }
                >
                  <SelectTrigger className="w-full text-base md:text-sm">
                    <SelectValue>{PROGRAM_TIER_LABEL[form.tier]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reach">Reach</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="likely">Likely</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    set("status", v as ProgramCreate["status"])
                  }
                >
                  <SelectTrigger className="w-full text-base md:text-sm">
                    <SelectValue>{PROGRAM_STATUS_LABEL[form.status]}</SelectValue>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={form.url ?? ""}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location ?? ""}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Seattle, WA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="app_fee">App fee ($)</Label>
                <Input
                  id="app_fee"
                  type="number"
                  value={form.app_fee ?? ""}
                  onChange={(e) =>
                    set("app_fee", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stipend">Annual stipend ($)</Label>
                <Input
                  id="stipend"
                  type="number"
                  value={form.stipend ?? ""}
                  onChange={(e) =>
                    set("stipend", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="decision_deadline">Reply deadline</Label>
              <Input
                id="decision_deadline"
                type="date"
                value={form.decision_deadline ?? ""}
                onChange={(e) => set("decision_deadline", e.target.value)}
                className="w-full appearance-none sm:appearance-auto"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
              />
            </div>

            {!isEdit && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={withDefaults}
                  onCheckedChange={(v) => setWithDefaults(v === true)}
                />
                Add standard requirements (SOP, CV, transcripts, letters, fee)
              </label>
            )}

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
                {mutation.isPending ? "Saving…" : isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
