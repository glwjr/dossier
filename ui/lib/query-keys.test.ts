import { describe, expect, it } from "vitest";

import { queryKeys } from "./query-keys";

/**
 * TanStack Query treats a queryKey as an invalidation match when it is a prefix
 * of a cached key. These tests assert that each entity's `root` is a prefix of
 * both its cross-program `all` list and its per-program `byProgram` list, so a
 * single root invalidation refreshes every variant.
 */
function isPrefix(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.every((part, i) => key[i] === part);
}

describe("queryKeys hierarchy", () => {
  const entities = ["requirements", "deadlines", "documents", "advisors"] as const;

  for (const entity of entities) {
    it(`${entity}.root is a prefix of .all and .byProgram`, () => {
      const e = queryKeys[entity];
      expect(isPrefix(e.root, e.all)).toBe(true);
      expect(isPrefix(e.root, e.byProgram(1))).toBe(true);
    });
  }

  it("recommenders.root covers the list and per-program junction", () => {
    const r = queryKeys.recommenders;
    expect(isPrefix(r.root, r.all)).toBe(true);
    expect(isPrefix(r.root, r.byProgram(1))).toBe(true);
  });

  it("programs.all is a prefix of a program detail key", () => {
    expect(isPrefix(queryKeys.programs.all, queryKeys.programs.detail(7))).toBe(true);
  });

  it("all vs byProgram do not collide", () => {
    expect(isPrefix(queryKeys.requirements.all, queryKeys.requirements.byProgram(1))).toBe(
      false,
    );
  });
});
