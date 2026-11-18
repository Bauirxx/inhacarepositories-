import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sem ligação",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-turquoise-light text-ocean">
        <WifiOff className="size-9" aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-ocean">Sem ligação à Internet</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Não foi possível carregar esta página. As páginas públicas que já visitou continuam
        disponíveis. Verifique a sua ligação e tente novamente.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Ir para o início</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/descobrir">Guia da ilha</Link>
        </Button>
      </div>
    </main>
  );
}
