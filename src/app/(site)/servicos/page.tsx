import type { Metadata } from "next";
import Link from "next/link";
import { Map, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessCard } from "@/components/business/business-card";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { AdSlot } from "@/components/shared/ad-slot";
import { createClient } from "@/lib/supabase/server";
import { listBusinessCategories, listBusinesses } from "@/services/businesses";
import { listActiveAds } from "@/services/ads";

export const metadata: Metadata = {
  title: "Diretório de serviços",
  description: "Hotéis, resorts, restaurantes, transportes, guias, comércio e serviços na Ilha de Inhaca.",
  alternates: { canonical: "/servicos" },
};

const sorts = [
  { value: "featured", label: "Relevância" },
  { value: "rating", label: "Melhor avaliados" },
  { value: "recent", label: "Mais recentes" },
  { value: "name", label: "Nome" },
];

export default async function ServicesPage({ searchParams }: PageProps<"/servicos">) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 100 ? v : undefined);
  const categoria = str(sp.categoria);
  const q = str(sp.q);
  const ordem = sorts.some((s) => s.value === sp.ordem) ? (sp.ordem as "featured") : "featured";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  const [categories, result, ads] = await Promise.all([
    listBusinessCategories(supabase),
    listBusinesses(supabase, { categorySlug: categoria, q, page, sort: ordem }),
    listActiveAds(supabase, "directory", 1),
  ]);
  const activeCategory = categories.find((c) => c.slug === categoria);
  const params = { categoria, q, ordem: ordem === "featured" ? undefined : ordem };

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader
        eyebrow="Diretório"
        title={activeCategory ? activeCategory.name : "Serviços e estabelecimentos"}
        description="Encontre onde ficar, comer, como se deslocar e quem pode ajudar na Ilha de Inhaca."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/mapa${categoria ? `?categoria=${categoria}` : ""}`}>
                <Map /> Ver no mapa
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/negocios/novo">
                <Plus /> Registar negócio
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchForm action="/servicos" defaultValue={q} placeholder="Pesquisar estabelecimentos…" hidden={{ categoria }} className="flex-1" />
        <form action="/servicos" className="flex gap-2">
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <select
            name="ordem"
            defaultValue={ordem}
            className="h-11 rounded-xl border bg-card px-3 text-sm"
            aria-label="Ordenar por"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Ordenar
          </Button>
        </form>
      </div>
      <div className="mb-6">
        <FilterChips
          basePath="/servicos"
          param="categoria"
          active={categoria}
          searchParams={params}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
      </div>
      {ads[0] ? (
        <div className="mb-6">
          <AdSlot ad={ads[0]} />
        </div>
      ) : null}
      {result.items.length === 0 ? (
        <EmptyState
          icon={Store}
          title={q || categoria ? "Sem resultados" : "Ainda não há estabelecimentos aprovados"}
          description={
            q || categoria
              ? "Experimente outra pesquisa ou categoria."
              : "Os estabelecimentos são publicados depois de aprovados pela administração."
          }
          action={
            <Button asChild>
              <Link href="/dashboard/negocios/novo">Registar o meu negócio</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{result.total} estabelecimento(s)</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {result.items.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </>
      )}
      <Pagination page={page} hasMore={result.hasMore} basePath="/servicos" searchParams={params} />
    </div>
  );
}
