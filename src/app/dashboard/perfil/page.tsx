import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { FormSection } from "@/components/shared/form-field";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { BlockedUsers } from "@/components/dashboard/blocked-users";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listBlockedUsers } from "@/services/messaging";

export const metadata: Metadata = { title: "Editar perfil", robots: { index: false } };

export default async function EditProfilePage() {
  const user = await requireUser("/dashboard/perfil");
  const blocked = await listBlockedUsers(await createClient(), user.id);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="O meu perfil"
        actions={
          <Button asChild variant="outline">
            <Link href={`/perfil/${user.profile.username}`}>Ver perfil público</Link>
          </Button>
        }
      />
      <ProfileForm profile={user.profile} />
      <div className="mt-6 grid gap-6">
        <FormSection title="Segurança da conta">
          <p className="text-sm text-muted-foreground">Email: {user.email}</p>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/redefinir-palavra-passe">Alterar palavra-passe</Link>
          </Button>
        </FormSection>
        <FormSection title="Utilizadores bloqueados" description="Utilizadores bloqueados não lhe podem enviar mensagens privadas.">
          <BlockedUsers users={blocked} />
        </FormSection>
      </div>
    </div>
  );
}
