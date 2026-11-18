import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { BusinessForm } from "@/components/business/business-form";
import { BusinessManagePanel } from "@/components/business/business-manage-panel";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getBusinessById, listBusinessCategories, listVerificationsForBusiness } from "@/services/businesses";

export const metadata: Metadata = { title: "Gerir estabelecimento", robots: { index: false } };

export default async function ManageBusinessPage({ params }: PageProps<"/dashboard/negocios/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/dashboard/negocios/${id}`);
  const supabase = await createClient();
  const [business, categories, verifications] = await Promise.all([
    getBusinessById(supabase, id),
    listBusinessCategories(supabase),
    listVerificationsForBusiness(supabase, id),
  ]);
  if (!business || (business.owner_id !== user.id && !isModerator(user.roles))) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={business.name}
        actions={
          <Button asChild variant="outline">
            <Link href={`/servicos/${business.slug}`}>
              <ExternalLink /> Ver página
            </Link>
          </Button>
        }
      >
        <div className="mt-2 flex items-center gap-2">
          <ContentStatusBadge status={business.status} />
          <span className="text-sm text-muted-foreground">{business.views_count} visualizações</span>
        </div>
      </PageHeader>
      {business.status === "pending" ? (
        <p className="mb-6 rounded-xl bg-sand-light p-3 text-sm text-amber-900">
          Aguarda aprovação. Será notificado quando a administração analisar o registo.
        </p>
      ) : null}
      {business.status === "rejected" ? (
        <p className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Registo não aprovado{business.rejection_reason ? `: ${business.rejection_reason}` : ""}. Corrija a informação e guarde para
          voltar a submeter.
        </p>
      ) : null}
      {business.status === "suspended" ? (
        <p className="mb-6 rounded-xl bg-neutral-100 p-3 text-sm">Estabelecimento suspenso pela moderação. Contacte a administração.</p>
      ) : null}
      <BusinessForm userId={user.id} categories={categories} business={business} />
      <div className="mt-6">
        <BusinessManagePanel businessId={business.id} userId={user.id} isVerified={business.is_verified} verifications={verifications} />
      </div>
    </div>
  );
}
