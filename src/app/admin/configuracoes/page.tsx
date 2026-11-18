import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/services/settings";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireRole(["admin"], "/admin/configuracoes");
  const settings = await getSiteSettings(await createClient());
  const hasSecret = Boolean(env.supabaseSecretKey);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações da plataforma" />
      {!hasSecret ? (
        <p className="mb-6 rounded-xl bg-sand-light p-3 text-sm text-amber-900">
          A variável <code>SUPABASE_SECRET_KEY</code> não está configurada. A suspensão de contas funciona ao nível da
          plataforma, mas não bloqueia o início de sessão no Supabase Auth. Consulte o README.
        </p>
      ) : null}
      <SettingsForm settings={settings} userId={user.id} />
    </div>
  );
}
