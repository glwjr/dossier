"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recommender, RecommenderCreate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  recommender?: Recommender;
  trigger: React.ReactElement;
}

const EMPTY: RecommenderCreate = {
  name: "",
  email: "",
  institution: "",
  notes: "",
};

function fromRecommender(r: Recommender): RecommenderCreate {
  return {
    name: r.name,
    email: r.email ?? "",
    institution: r.institution ?? "",
    notes: r.notes ?? "",
  };
}

export function RecommenderDialog({ recommender, trigger }: Props) {
  const isEdit = !!recommender;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RecommenderCreate>(
    recommender ? fromRecommender(recommender) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<Recommender, Error, RecommenderCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Recommender>(`/recommenders/${recommender.id}`, data)
        : api.post<Recommender>("/recommenders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommenders"] });
      setOpen(false);
    },
  });

  function set<K extends keyof RecommenderCreate>(
    key: K,
    value: RecommenderCreate[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(recommender ? fromRecommender(recommender) : EMPTY);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      email: form.email || null,
      institution: form.institution || null,
      notes: form.notes || null,
    });
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
              {isEdit ? "Edit recommender" : "Add recommender"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-name">Name</Label>
              <Input
                id="rec-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-institution">Institution</Label>
              <Input
                id="rec-institution"
                value={form.institution ?? ""}
                onChange={(e) => set("institution", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-email">Email</Label>
              <Input
                id="rec-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-notes">Notes</Label>
              <Textarea
                id="rec-notes"
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
