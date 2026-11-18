import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ocean">Junte-se à comunidade</h1>
      <p className="mt-2 text-muted-foreground">
        Crie a sua conta gratuita. Consultar a plataforma não exige registo; a conta serve para participar.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-turquoise hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
