"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Advisor, AdvisorCreate } from "@/lib/types";
import { ADVISOR_RESPONSE_LABEL } from "@/lib/display";
import { Button } from "@/components/ui/button";
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
  programId: number;
  contact?: Advisor;
  trigger: React.ReactElement;
}

const EMPTY: AdvisorCreate = {
  name: "",
  email: "",
  url: "",
  research_area: "",
  contacted_on: "",
  response: "none",
  notes: "",
};

function fromContact(c: Advisor): AdvisorCreate {
  return {
    name: c.name,
    email: c.email ?? "",
    url: c.url ?? "",
    research_area: c.research_area ?? "",
    contacted_on: c.contacted_on ?? "",
    response: c.response as AdvisorCreate["response"],
    notes: c.notes ?? "",
  };
}

export function AdvisorDialog({ programId, contact, trigger }: Props) {
  const isEdit = !!contact;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdvisorCreate>(
    contact ? fromContact(contact) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<Advisor, Error, AdvisorCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Advisor>(`/advisors/${contact.id}`, data)
        : api.post<Advisor>(`/programs/${programId}/advisors`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisors", programId] });
      queryClient.invalidateQueries({ queryKey: ["advisors-all"] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: onMutationError,
  });

  function set<K extends keyof AdvisorCreate>(
    key: K,
    value: AdvisorCreate[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(contact ? fromContact(contact) : EMPTY);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      email: form.email || null,
      url: form.url || null,
      research_area: form.research_area || null,
      contacted_on: form.contacted_on || null,
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
              {isEdit ? "Edit advisor" : "Add advisor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-research">Research area</Label>
              <Input
                id="contact-research"
                value={form.research_area ?? ""}
                onChange={(e) => set("research_area", e.target.value)}
                placeholder="e.g. Computational neuroscience"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-date">Contacted on</Label>
                <Input
                  id="contact-date"
                  type="date"
                  value={form.contacted_on ?? ""}
                  onChange={(e) => set("contacted_on", e.target.value)}
                  className="appearance-none sm:appearance-auto"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Response</Label>
                <Select
                  value={form.response}
                  onValueChange={(v) =>
                    v && set("response", v as AdvisorCreate["response"])
                  }
                >
                  <SelectTrigger className="w-full text-base md:text-sm">
                    <SelectValue>
                      {ADVISOR_RESPONSE_LABEL[form.response ?? "none"]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="meeting_scheduled">
                      Meeting scheduled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-url">Profile URL</Label>
                <Input
                  id="contact-url"
                  type="url"
                  value={form.url ?? ""}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
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
