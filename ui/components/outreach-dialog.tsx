"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { OutreachContact, OutreachCreate } from "@/lib/types";
import { OUTREACH_RESPONSE_LABEL } from "@/lib/display";
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
  contact?: OutreachContact;
  trigger: React.ReactElement;
}

const EMPTY: OutreachCreate = {
  name: "",
  email: "",
  url: "",
  contacted_on: "",
  response: "none",
  notes: "",
};

function fromContact(c: OutreachContact): OutreachCreate {
  return {
    name: c.name,
    email: c.email ?? "",
    url: c.url ?? "",
    contacted_on: c.contacted_on ?? "",
    response: c.response as OutreachCreate["response"],
    notes: c.notes ?? "",
  };
}

export function OutreachDialog({ programId, contact, trigger }: Props) {
  const isEdit = !!contact;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OutreachCreate>(
    contact ? fromContact(contact) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<OutreachContact, Error, OutreachCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<OutreachContact>(`/outreach/${contact.id}`, data)
        : api.post<OutreachContact>(`/programs/${programId}/outreach`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach", programId] });
      queryClient.invalidateQueries({ queryKey: ["outreach-all"] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: () => toast.error("Something went wrong"),
  });

  function set<K extends keyof OutreachCreate>(
    key: K,
    value: OutreachCreate[K]
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
              {isEdit ? "Edit contact" : "Add outreach contact"}
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
                    v && set("response", v as OutreachCreate["response"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {OUTREACH_RESPONSE_LABEL[form.response ?? "none"]}
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
