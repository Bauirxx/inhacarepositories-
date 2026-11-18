import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Eye, Plus, Star, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { CoverImage } from "@/components/shared/cover-image";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyBusinesses } from "@/services/businesses";

export const metadata: Metadata = { title: "Os meus negócios", robots: { index: false } };

export default async function MyBusinessesPage() {
  const user = await requireUser("/dashboard/negocios");
  const businesses = await listMyBusinesses(await createClient(), user.id);
  return (
    <div>
      <PageHeader
        title="Área empresarial"
        description="Gerir os seus estabelecimentos, contactos, horários, serviços e fotografias."
        actions={
          <Button asChild>
            <Link href="/dashboard/negocios/novo">
              <Plus /> Novo estabelecimento
            </Link>
          </Button>
        }
      />
      {businesses.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Ainda não tem estabelecimentos"
          description="Registe o seu hotel, restaurante, serviço de transporte, loja ou atividade turística. É gratuito."
          action={
            <Button asChild>
              <Link href="/dashboard/negocios/novo">Registar agora</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {businesses.map((b) => (
            <li key={b.id} className="flex overflow-hidden rounded-2xl border bg-card shadow-sm">
              <CoverImage src={b.cover_url ?? b.logo_url} alt={b.name} className="w-28 shrink-0 sm:w-36" sizes="144px" />
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-bold text-ocean">{b.name}</p>
                  <ContentStatusBadge status={b.status} />
                </div>
                <p className="text-sm text-muted-foreground">{b.category?.name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5" /> {b.views_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5" /> {Number(b.rating_avg).toFixed(1)} ({b.rating_count})
                  </span>
                  {b.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-turquoise">
                      <BadgeCheck className="size-3.5" /> Verificado
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex gap-2 pt-3">
                  <Button asChild size="sm">
                    <Link href={`/dashboard/negocios/${b.id}`}>Gerir</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/servicos/${b.slug}`}>Ver página</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
