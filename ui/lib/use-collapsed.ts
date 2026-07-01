import { useCallback, useEffect, useState } from "react";

/**
 * Collapsed-section state (a set of section keys) persisted to localStorage so
 * it survives navigation and reloads. Keyed per page via `storageKey`.
 */
export function useCollapsedSections(storageKey: string) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
    } catch {
      // ignore write failures (e.g. storage disabled)
    }
  }, [storageKey, collapsed]);

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const collapseAll = useCallback((keys: string[]) => setCollapsed(new Set(keys)), []);
  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  return { collapsed, toggle, collapseAll, expandAll };
}
