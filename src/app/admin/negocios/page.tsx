import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { ModerationButtons } from "@/components/admin/moderation-buttons";
import { ActionButton } from "@/components/admin/toggle-action";
import { StatusTabs } from "@/components/admin/status-tabs";
import { VerificationActions } from "@/components/admin/verification-actions";
import { createClient } from "@/lib/supabase/server";
import { listBusinessesForAdmin, listVerifications } from "@/services/businesses";
import { setBusinessFlag } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/utils";
import type { ContentStatus } from "@/types";

export const metadata: Metadata = { title: "Estabelecimentos" };

const tabs = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "suspended", label: "Suspensos" },
  { value: "all", label: "Todos" },
  { value: "verificacoes", label: "Verificações" },
];

export default async function AdminBusinessesPage({ searchParams }: PageProps<"/admin/negocios">) {
  const sp = await searchParams;
  const estado = tabs.some((t) => t.value === sp.estado) ? (sp.estado as string) : "pending";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  return (
    <div>
      <PageHeader title="Estabelecimentos" description="Aprovar registos, validar localizações, destacar e verificar negócios." />
      <StatusTabs basePath="/admin/negocios" active={estado} options={tabs} />
      {estado === "verificacoes" ? (
        <Verifications supabase={supabase} />
      ) : (
        <BusinessList status={estado as ContentStatus | "all"} q={q} page={page} supabase={supabase} />
      )}
    </div>
  );

}

async function Verifications({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
  const items = await listVerifications(supabase, "pending");
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem pedidos de verificação pendentes.</p>;
  return (
    <ul className="divide-y rounded-2xl border bg-card shadow-sm">
      {items.map((v) => (
        <li key={v.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Link href={`/servicos/${v.business?.slug ?? ""}`} className="font-semibold hover:text-turquoise">
              {v.business?.name}
            </Link>
            <p className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</p>
            {v.notes ? <p className="mt-1 text-sm">{v.notes}</p> : null}
          </div>
          <VerificationActions id={v.id} documentPath={v.document_url} />
        </li>
      ))}
    </ul>
  );
}

async function BusinessList({
  status,
  q,
  page,
  supabase,
}: {
  status: ContentStatus | "all";
  q?: string;
  page: number;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { items, total, hasMore } = await listBusinessesForAdmin(supabase, { status, q, page });
  return (
    <>
      <SearchForm action="/admin/negocios" defaultValue={q} hidden={{ estado: status }} placeholder="Pesquisar por nome…" className="mb-4 max-w-md" />
      <p className="mb-2 text-sm text-muted-foreground">{total} registo(s)</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem registos.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {items.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/servicos/${b.slug}`} className="font-semibold hover:text-turquoise">
                    {b.name}
                  </Link>
                  <ContentStatusBadge status={b.status} />
                  {b.is_verified ? <BadgeCheck className="size-4 text-turquoise" aria-label="Verificado" /> : null}
                  {b.is_featured ? <Star className="size-4 fill-sand text-sand" aria-label="Destaque" /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {b.category?.name} · {b.owner?.full_name} (@{b.owner?.username}) · {formatDateTime(b.created_at)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  <MapPin className="size-3.5 text-turquoise" />
                  {b.latitude != null && b.longitude != null ? (
                    <a
                      className="text-turquoise underline"
                      href={`https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=17/${b.latitude}/${b.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Validar coordenadas ({b.latitude.toFixed(5)}, {b.longitude.toFixed(5)})
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Sem coordenadas</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ModerationButtons kind="business" id={b.id} status={b.status} />
                <ActionButton action={setBusinessFlag.bind(null, { id: b.id, value: !b.is_featured }, "is_featured")}>
                  {b.is_featured ? "Remover destaque" : "Destacar"}
                </ActionButton>
                <ActionButton action={setBusinessFlag.bind(null, { id: b.id, value: !b.is_verified }, "is_verified")}>
                  {b.is_verified ? "Retirar verificação" : "Verificar"}
                </ActionButton>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/dashboard/negocios/${b.id}`}>Editar</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} hasMore={hasMore} basePath="/admin/negocios" searchParams={{ estado: status, q }} />
    </>
  );
}
