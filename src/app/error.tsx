"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const isConfig = error.message?.includes("Variável de ambiente em falta");
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <AlertTriangle className="size-12 text-coral" />
      <h1 className="mt-4 text-2xl font-extrabold text-ocean">Ocorreu um problema</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        {isConfig
          ? "A plataforma ainda não está configurada (variáveis do Supabase em falta). Consulte o README."
          : "Não foi possível carregar esta página. Pode ser uma falha temporária de ligação."}
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Referência: {error.digest}</p> : null}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button asChild variant="outline">
          <Link href="/">Início</Link>
        </Button>
      </div>
    </main>
  );
}
