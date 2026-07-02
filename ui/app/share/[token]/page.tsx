"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShareView } from "@/lib/types";
import {
  PROGRAM_STATUS_LABEL,
  PROGRAM_TIER_LABEL,
  formatDate,
} from "@/lib/display";
import { usePageTitle } from "@/lib/use-page-title";

type LoadState = "loading" | "ok" | "notfound";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<ShareView | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  usePageTitle("Shared list");

  useEffect(() => {
    let active = true;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/share/${token}`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d: ShareView | null) => {
        if (!active) return;
        if (d) {
          setData(d);
          setState("ok");
        } else {
          setState("notfound");
        }
      })
      .catch(() => active && setState("notfound"));
    return () => {
      active = false;
    };
  }, [token]);

  if (state === "loading")
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (state === "notfound" || !data)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">Share link not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This link may have been disabled by its owner.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{data.name}&apos;s programs</h1>
        <p className="text-sm text-muted-foreground">
          {data.programs.length} program{data.programs.length === 1 ? "" : "s"} ·
          read-only
        </p>
      </div>
      <div className="space-y-2">
        {data.programs.map((p, i) => (
          <div key={i} className="rounded-md border px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.school}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.department} · {p.degree}
                  {p.location ? ` · ${p.location}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs">
                <p>{PROGRAM_STATUS_LABEL[p.status] ?? p.status}</p>
                <p className="text-muted-foreground">
                  {PROGRAM_TIER_LABEL[p.tier] ?? p.tier}
                </p>
              </div>
            </div>
            {p.decision_deadline && (
              <p className="mt-1 text-xs text-muted-foreground">
                Decision by {formatDate(p.decision_deadline)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
