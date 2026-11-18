import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/authentication/actions";

export const metadata: Metadata = { title: "Conta suspensa", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-16 text-center">
      <ShieldAlert className="size-14 text-coral" />
      <h1 className="mt-4 text-2xl font-extrabold text-ocean">A sua conta está suspensa</h1>
      <p className="mt-3 text-muted-foreground">
        A administração suspendeu esta conta por violação dos termos de utilização. Continua a poder consultar os conteúdos
        públicos. Se considera que se trata de um erro, contacte a administração através dos contactos no rodapé.
      </p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="outline">
          Terminar sessão
        </Button>
      </form>
    </div>
  );
}
