"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Program, RequirementWithProgram, Recommender, AdvisorWithProgram, DocumentWithProgram } from "@/lib/types";
import { PROGRAM_STATUS_LABEL } from "@/lib/display";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type Result =
  | { kind: "program"; id: number; label: string; sub: string; snippet?: string }
  | { kind: "requirement"; id: number; label: string; sub: string; programId: number; snippet?: string }
  | { kind: "recommender"; id: number; label: string; sub: string; snippet?: string }
  | { kind: "advisor"; id: number; label: string; sub: string; programId: number; snippet?: string }
  | { kind: "document"; id: number; label: string; sub: string; programId: number; snippet?: string };

// Return a trimmed excerpt of the first field that contains the query, centered
// on the match — used to show *why* a result matched (e.g. a notes hit).
function snippetOf(
  q: string,
  ...fields: (string | null | undefined)[]
): string | undefined {
  for (const f of fields) {
    if (!f) continue;
    const i = f.toLowerCase().indexOf(q);
    if (i === -1) continue;
    const start = Math.max(0, i - 30);
    const end = Math.min(f.length, i + q.length + 30);
    return (
      (start > 0 ? "…" : "") +
      f.slice(start, end).trim() +
      (end < f.length ? "…" : "")
    );
  }
  return undefined;
}

// Render text with the (case-insensitive) query occurrence emphasized.
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-medium text-foreground">
        {text.slice(i, i + q.length)}
      </span>
      {text.slice(i + q.length)}
    </>
  );
}

function href(r: Result): string {
  if (r.kind === "program") return `/programs/${r.id}`;
  if (r.kind === "requirement") return `/programs/${r.programId}?tab=requirements`;
  if (r.kind === "advisor") return `/programs/${r.programId}?tab=advisors`;
  if (r.kind === "document") return `/programs/${r.programId}?tab=documents`;
  return `/recommenders`;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/programs"),
    enabled: open,
  });

  const { data: requirements = [] } = useQuery<RequirementWithProgram[]>({
    queryKey: ["requirements-all"],
    queryFn: () => api.get("/requirements"),
    enabled: open,
  });

  const { data: recommenders = [] } = useQuery<Recommender[]>({
    queryKey: ["recommenders"],
    queryFn: () => api.get("/recommenders"),
    enabled: open,
  });

  const { data: advisors = [] } = useQuery<AdvisorWithProgram[]>({
    queryKey: ["advisors-all"],
    queryFn: () => api.get("/advisors"),
    enabled: open,
  });

  const { data: documents = [] } = useQuery<DocumentWithProgram[]>({
    queryKey: ["documents-all"],
    queryFn: () => api.get("/documents"),
    enabled: open,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocused(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const results: Result[] = [];

  if (q) {
    const matchedPrograms = programs.filter(
      (p) =>
        p.school.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.notes ?? "").toLowerCase().includes(q)
    );
    for (const p of matchedPrograms.slice(0, 5)) {
      results.push({
        kind: "program",
        id: p.id,
        label: p.school,
        sub: `${p.department} · ${PROGRAM_STATUS_LABEL[p.status]}`,
        snippet: snippetOf(q, p.notes),
      });
    }

    const matchedReqs = requirements.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.program.school.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
    );
    for (const r of matchedReqs.slice(0, 3)) {
      results.push({
        kind: "requirement",
        id: r.id,
        label: r.label,
        sub: r.program.school,
        programId: r.program.id,
        snippet: snippetOf(q, r.notes),
      });
    }

    const matchedRecs = recommenders.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.institution ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
    );
    for (const r of matchedRecs.slice(0, 3)) {
      results.push({
        kind: "recommender",
        id: r.id,
        label: r.name,
        sub: r.institution ?? "Recommender",
        snippet: snippetOf(q, r.notes),
      });
    }

    const matchedAdvisors = advisors.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        (o.research_area ?? "").toLowerCase().includes(q) ||
        (o.notes ?? "").toLowerCase().includes(q) ||
        o.program.school.toLowerCase().includes(q)
    );
    for (const o of matchedAdvisors.slice(0, 3)) {
      results.push({
        kind: "advisor",
        id: o.id,
        label: o.name,
        sub: o.program.school,
        programId: o.program.id,
        snippet: snippetOf(q, o.research_area, o.notes, o.email),
      });
    }

    const matchedDocs = documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.program.school.toLowerCase().includes(q) ||
        (d.notes ?? "").toLowerCase().includes(q)
    );
    for (const d of matchedDocs.slice(0, 3)) {
      results.push({
        kind: "document",
        id: d.id,
        label: d.title,
        sub: d.program.school,
        programId: d.program.id,
        snippet: snippetOf(q, d.notes),
      });
    }
  }

  useEffect(() => {
    setFocused(0);
  }, [query]);

  function navigate(r: Result) {
    router.push(href(r));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[focused]) {
      navigate(results[focused]);
    }
  }

  const KIND_LABEL: Record<Result["kind"], string> = {
    program: "Program",
    requirement: "Requirement",
    recommender: "Recommender",
    advisor: "Advisor",
    document: "Document",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="p-0 sm:max-w-lg">
        <div className="border-b px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search anything…"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </div>
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {q ? "No results." : "Start typing to search."}
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}`}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                  i === focused ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                }`}
                onMouseEnter={() => setFocused(i)}
                onClick={() => navigate(r)}
              >
                <span className="w-24 shrink-0 rounded bg-muted py-0.5 text-center text-xs text-muted-foreground">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  {r.snippet && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">
                      <Highlight text={r.snippet} q={q} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="hidden border-t px-4 py-2 text-xs text-muted-foreground sm:flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
