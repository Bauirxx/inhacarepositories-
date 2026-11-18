import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <Compass className="mt-10 size-14 text-turquoise" />
      <h1 className="mt-4 text-3xl font-extrabold text-ocean">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        O conteúdo que procura não existe, foi removido ou ainda aguarda aprovação.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Voltar ao início</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pesquisa">Pesquisar</Link>
        </Button>
      </div>
    </main>
  );
}
