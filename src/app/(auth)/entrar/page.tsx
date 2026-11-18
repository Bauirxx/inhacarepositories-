import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeInternalPath(sp.next, "/dashboard") : undefined;
  const error = typeof sp.erro === "string" ? sp.erro : undefined;
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ocean">Bem-vindo de volta</h1>
      <p className="mt-2 text-muted-foreground">Entre para publicar, comentar e falar com a comunidade.</p>
      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>A ligação é inválida ou expirou. Tente novamente.</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href={`/registar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-turquoise hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
