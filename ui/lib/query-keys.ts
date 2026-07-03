/**
 * Central TanStack Query key factory — the single source of truth for cache
 * keys and, crucially, for invalidation.
 *
 * Keys are hierarchical so a single prefix invalidation refreshes every
 * variant of an entity. For example `queryKeys.requirements.root` is a prefix
 * of both `.all` (the cross-program list) and `.byProgram(id)` (a program's
 * list), so invalidating the root after any mutation refreshes all of them.
 * This replaces the previous hand-written strings, where the cross-program
 * lists were spelled `"<entity>-all"` and were therefore missed by
 * `invalidateQueries(["<entity>"])`, leaving those views stale.
 */

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  me: ["me"] as const,
  adminStats: ["admin-stats"] as const,

  programs: {
    all: ["programs"] as const,
    detail: (id: number) => ["programs", "detail", id] as const,
  },
  requirements: {
    // Prefix of both `.all` and `.byProgram(...)`; invalidate to refresh every
    // requirement query at once.
    root: ["requirements"] as const,
    all: ["requirements", "all"] as const,
    byProgram: (programId: number) =>
      ["requirements", "program", programId] as const,
  },
  deadlines: {
    root: ["deadlines"] as const,
    all: ["deadlines", "all"] as const,
    byProgram: (programId: number) => ["deadlines", "program", programId] as const,
  },
  documents: {
    root: ["documents"] as const,
    all: ["documents", "all"] as const,
    byProgram: (programId: number) => ["documents", "program", programId] as const,
  },
  advisors: {
    root: ["advisors"] as const,
    all: ["advisors", "all"] as const,
    byProgram: (programId: number) => ["advisors", "program", programId] as const,
  },
  recommenders: {
    // Root prefix covers both the cross-program list (`.all`) and each
    // program's junction list (`.byProgram(...)`), so assigning/unassigning a
    // recommender can refresh both with one invalidation.
    root: ["recommenders"] as const,
    all: ["recommenders", "all"] as const,
    byProgram: (programId: number) =>
      ["recommenders", "program", programId] as const,
  },
} as const;
