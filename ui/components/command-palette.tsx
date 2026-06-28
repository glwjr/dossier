"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Program, RequirementWithProgram, Recommender } from "@/lib/types";
import { PROGRAM_STATUS_LABEL } from "@/lib/display";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type Result =
  | { kind: "program"; id: number; label: string; sub: string }
  | { kind: "requirement"; id: number; label: string; sub: string; programId: number }
  | { kind: "recommender"; id: number; label: string; sub: string };

function href(r: Result): string {
  if (r.kind === "program") return `/programs/${r.id}`;
  if (r.kind === "requirement") return `/programs/${r.programId}?tab=requirements`;
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  const matchedPrograms = programs.filter(
    (p) =>
      !q ||
      p.school.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
  );
  for (const p of matchedPrograms.slice(0, 5)) {
    results.push({
      kind: "program",
      id: p.id,
      label: p.school,
      sub: `${p.department} · ${PROGRAM_STATUS_LABEL[p.status]}`,
    });
  }

  if (q) {
    const matchedReqs = requirements.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.program.school.toLowerCase().includes(q)
    );
    for (const r of matchedReqs.slice(0, 4)) {
      results.push({
        kind: "requirement",
        id: r.id,
        label: r.label,
        sub: r.program.school,
        programId: r.program.id,
      });
    }

    const matchedRecs = recommenders.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.institution ?? "").toLowerCase().includes(q)
    );
    for (const r of matchedRecs.slice(0, 3)) {
      results.push({
        kind: "recommender",
        id: r.id,
        label: r.name,
        sub: r.institution ?? "Recommender",
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
            placeholder="Search programs, requirements, recommenders…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
