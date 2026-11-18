import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Recuperar palavra-passe", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ocean">Recuperar palavra-passe</h1>
      <p className="mt-2 text-muted-foreground">Indique o email da sua conta para receber uma ligação de recuperação.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/entrar" className="font-semibold text-turquoise hover:underline">
          Voltar a entrar
        </Link>
      </p>
    </div>
  );
}
