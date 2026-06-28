"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Document, DocumentCreate } from "@/lib/types";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/lib/display";
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
  document?: Document;
  trigger: React.ReactElement;
}

const EMPTY: DocumentCreate = {
  kind: "other",
  title: "",
  status: "draft",
  url: "",
  notes: "",
};

function fromDocument(d: Document): DocumentCreate {
  return {
    kind: d.kind as DocumentCreate["kind"],
    title: d.title,
    status: d.status as DocumentCreate["status"],
    url: d.url ?? "",
    notes: d.notes ?? "",
  };
}

export function DocumentDialog({ programId, document, trigger }: Props) {
  const isEdit = !!document;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DocumentCreate>(
    document ? fromDocument(document) : EMPTY
  );
  const queryClient = useQueryClient();

  const mutation = useMutation<Document, Error, DocumentCreate>({
    mutationFn: (data) =>
      isEdit
        ? api.patch<Document>(`/documents/${document.id}`, data)
        : api.post<Document>(`/programs/${programId}/documents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", programId] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: () => toast.error("Something went wrong"),
  });

  function set<K extends keyof DocumentCreate>(
    key: K,
    value: DocumentCreate[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpen() {
    setForm(document ? fromDocument(document) : EMPTY);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ ...form, url: form.url || null, notes: form.notes || null });
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
              {isEdit ? "Edit document" : "Add document"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    v && set("kind", v as DocumentCreate["kind"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{DOCUMENT_KIND_LABEL[form.kind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">SOP</SelectItem>
                    <SelectItem value="personal_statement">
                      Personal statement
                    </SelectItem>
                    <SelectItem value="cv">CV</SelectItem>
                    <SelectItem value="writing_sample">
                      Writing sample
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    v && set("status", v as DocumentCreate["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {DOCUMENT_STATUS_LABEL[form.status]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-url">Link</Label>
              <Input
                id="doc-url"
                type="url"
                value={form.url ?? ""}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://docs.google.com/…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-notes">Notes</Label>
              <Textarea
                id="doc-notes"
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
