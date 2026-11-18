"use client";

import { useEffect } from "react";

/**
 * Regista o service worker (PWA) apenas em produção e em browsers compatíveis.
 * O ficheiro public/sw.js faz cache dos recursos estáticos e das páginas
 * públicas visitadas, permitindo consulta básica sem ligação.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[pwa] registo do service worker falhou", err);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
