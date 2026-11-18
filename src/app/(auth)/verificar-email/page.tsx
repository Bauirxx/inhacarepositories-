import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirme o seu email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verificar-email">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : null;
  return (
    <div className="text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-turquoise-light">
        <MailCheck className="size-9 text-ocean" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-ocean">Confirme o seu email</h1>
      <p className="mt-3 text-muted-foreground">
        Enviámos uma ligação de confirmação{email ? (
          <>
            {" "}para <strong className="text-foreground">{email}</strong>
          </>
        ) : null}
        . Abra o email e toque na ligação para ativar a conta.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Não encontra o email? Verifique a pasta de spam.</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/entrar">Ir para entrar</Link>
      </Button>
    </div>
  );
}
