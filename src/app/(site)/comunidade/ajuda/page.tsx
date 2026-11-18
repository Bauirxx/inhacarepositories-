import type { Metadata } from "next";
import Link from "next/link";
import { HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { HelpStatusBadge, HelpTypeBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
import { HelpRequestForm } from "@/components/community/help-request-form";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listHelpRequests } from "@/services/help";
import { helpRequestTypeLabels } from "@/config/site";
import type { HelpRequestType } from "@/types";

export const metadata: Metadata = {
  title: "Ajuda comunitária",
  description: "Pedidos de assistência, transporte, produtos e serviços entre os habitantes da Ilha de Inhaca.",
};

export default async function HelpPage({ searchParams }: PageProps<"/comunidade/ajuda">) {
  const sp = await searchParams;
  const type = typeof sp.tipo === "string" && sp.tipo in helpRequestTypeLabels ? (sp.tipo as HelpRequestType) : null;
  const showAll = sp.estado === "todos";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { items, hasMore } = await listHelpRequests(supabase, { status: showAll ? "all" : "open", type, page });
  const params = { tipo: type ?? undefined, estado: showAll ? "todos" : undefined };

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader
        eyebrow="Comunidade"
        title="Ajuda comunitária"
        description="Um espaço de entreajuda: transporte, produtos, serviços, emprego e apoio a quem precisa."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <FilterChips
              basePath="/comunidade/ajuda"
              param="tipo"
              active={type}
              searchParams={params}
              options={Object.entries(helpRequestTypeLabels).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <Link
            href={`/comunidade/ajuda?${new URLSearchParams({ ...(type ? { tipo: type } : {}), ...(showAll ? {} : { estado: "todos" }) })}`}
            className="mb-4 inline-block text-sm font-medium text-turquoise hover:underline"
          >
            {showAll ? "Mostrar apenas pedidos abertos" : "Mostrar também resolvidos e fechados"}
          </Link>
          {items.length === 0 ? (
            <EmptyState icon={HandHelping} title="Sem pedidos" description="Não há pedidos com estes filtros." />
          ) : (
            <ul className="space-y-3">
              {items.map((h) => (
                <li key={h.id}>
                  <Link href={`/comunidade/ajuda/${h.id}`} className="block rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
                    <div className="flex flex-wrap items-center gap-2">
                      <HelpTypeBadge type={h.type} />
                      <HelpStatusBadge status={h.status} />
                    </div>
                    <h2 className="mt-2 font-semibold text-ocean">{h.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <UserAvatar name={h.author?.full_name} src={h.author?.avatar_url} size="xs" />
                      {h.author?.full_name} · <RelativeTime value={h.created_at} />
                      {h.location ? ` · ${h.location}` : ""}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} hasMore={hasMore} basePath="/comunidade/ajuda" searchParams={params} />
        </div>
        <aside id="novo" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-ocean">Publicar um pedido</h2>
            {user ? (
              <div className="mt-4">
                <HelpRequestForm />
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>Para publicar um pedido de ajuda precisa de iniciar sessão.</p>
                <Button asChild>
                  <Link href="/entrar?next=/comunidade/ajuda">Entrar</Link>
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
