import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/password-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nova palavra-passe", robots: { index: false } };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar");
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ocean">Definir nova palavra-passe</h1>
      <p className="mt-2 text-muted-foreground">Escolha uma palavra-passe com pelo menos 8 caracteres, letras e números.</p>
      <div className="mt-8">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
