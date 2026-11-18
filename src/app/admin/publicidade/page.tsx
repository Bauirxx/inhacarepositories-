import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { CoverImage } from "@/components/shared/cover-image";
import { ActionButton } from "@/components/admin/toggle-action";
import { AdFormDialog } from "@/components/admin/ad-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listAllAds } from "@/services/ads";
import { deleteAdvertisement } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicidade" };

const placementLabels: Record<string, string> = {
  home: "Página inicial",
  feed: "Feed",
  directory: "Diretório",
  sidebar: "Barra lateral",
};

function isLive(ad: { is_active: boolean; starts_at: string | null; ends_at: string | null }): boolean {
  const now = Date.now();
  return (
    ad.is_active &&
    (!ad.starts_at || new Date(ad.starts_at).getTime() <= now) &&
    (!ad.ends_at || new Date(ad.ends_at).getTime() >= now)
  );
}

export default async function AdminAdsPage() {
  const user = await requireRole(["admin"], "/admin/publicidade");
  const ads = await listAllAds(await createClient());
  return (
    <div>
      <PageHeader
        title="Publicidade"
        description="Espaços publicitários para negócios locais. Os anúncios são identificados como publicidade."
        actions={<AdFormDialog userId={user.id} />}
      />
      {ads.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem anúncios.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {ads.map((ad) => {
            const live = isLive(ad);
            return (
              <li key={ad.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <CoverImage src={ad.image_url} alt={ad.title} className="aspect-[4/1] w-full shrink-0 rounded-lg sm:w-48" sizes="192px" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {ad.title} {live ? <Badge>No ar</Badge> : <Badge variant="outline">Inativo</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {placementLabels[ad.placement]} · {ad.advertiser_name ?? "—"} ·{" "}
                    {ad.starts_at ? formatDateTime(ad.starts_at) : "sem início"} → {ad.ends_at ? formatDateTime(ad.ends_at) : "sem fim"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <AdFormDialog ad={ad} userId={user.id} />
                  <ActionButton action={deleteAdvertisement.bind(null, ad.id)} variant="destructive" confirmText="Eliminar este anúncio?" successText="Eliminado.">
                    Eliminar
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
