"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { onMutationError } from "@/lib/mutation-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  trigger: React.ReactElement;
}

type NewProgram = {
  school: string;
  department: string;
  degree: string;
  tier: string;
  status: string;
};

// One program per line: "School" or "School, Department". Everything else gets
// sensible defaults the user can edit afterward.
function parse(text: string): NewProgram[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      const school = comma === -1 ? line : line.slice(0, comma);
      const department = comma === -1 ? "" : line.slice(comma + 1).trim();
      return {
        school: school.trim(),
        department,
        degree: "PhD",
        tier: "match",
        status: "researching",
      };
    })
    .filter((p) => p.school);
}

export function ImportProgramsDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const programs = parse(text);
  const tooMany = programs.length > 100;

  const importMutation = useMutation({
    mutationFn: () => api.post<Program[]>("/programs/import", { programs }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Imported ${created.length} program(s)`);
      setText("");
      setOpen(false);
    },
    onError: onMutationError,
  });

  return (
    <>
      <span style={{ display: "contents" }} onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import programs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              One program per line, as <code>School</code> or{" "}
              <code>School, Department</code>. Degree defaults to PhD and tier to
              Match — edit details after importing.
            </p>
            <Textarea
              autoFocus
              rows={8}
              placeholder={"MIT, EECS\nStanford, Computer Science\nUC Berkeley"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {programs.length} program{programs.length === 1 ? "" : "s"} detected
                {tooMany ? " — max 100 per import" : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={
                    programs.length === 0 || tooMany || importMutation.isPending
                  }
                >
                  {importMutation.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
