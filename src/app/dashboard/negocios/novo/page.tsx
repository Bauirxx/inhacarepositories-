import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BusinessForm } from "@/components/business/business-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listBusinessCategories } from "@/services/businesses";

export const metadata: Metadata = { title: "Registar estabelecimento", robots: { index: false } };

export default async function NewBusinessPage() {
  const user = await requireUser("/dashboard/negocios/novo");
  const categories = await listBusinessCategories(await createClient());
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Registar estabelecimento"
        description="Preencha a informação do seu negócio. Após a submissão, a administração verifica os dados e a localização antes de publicar."
      />
      <BusinessForm userId={user.id} categories={categories} />
    </div>
  );
}
