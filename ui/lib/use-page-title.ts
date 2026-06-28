import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Dossier`;
    return () => {
      document.title = "Dossier";
    };
  }, [title]);
}
