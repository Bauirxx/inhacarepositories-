"use client";

import { useEffect } from "react";
import { trackBusinessView } from "@/features/businesses/actions";
import { trackProductView } from "@/features/products/actions";

/** Regista uma visualização uma vez por sessão do browser. */
export function ViewTracker({ kind, id }: { kind: "business" | "product"; id: string }) {
  useEffect(() => {
    const key = `viewed:${kind}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* armazenamento indisponível */
    }
    (kind === "business" ? trackBusinessView(id) : trackProductView(id)).catch(() => undefined);
  }, [kind, id]);
  return null;
}
