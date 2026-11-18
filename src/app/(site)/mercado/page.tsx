import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "@/components/marketplace/product-card";
import { createClient } from "@/lib/supabase/server";
import { listProductCategories, listProducts } from "@/services/products";

export const metadata: Metadata = {
  title: "Mercado local",
  description: "Peixe e marisco, produtos agrícolas, artesanato, alimentação e outros produtos vendidos na Ilha de Inhaca.",
  alternates: { canonical: "/mercado" },
};

const sorts = [
  { value: "recent", label: "Mais recentes" },
  { value: "price_asc", label: "Preço: mais baixo" },
  { value: "price_desc", label: "Preço: mais alto" },
];

export default async function MarketPage({ searchParams }: PageProps<"/mercado">) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 100 ? v : undefined);
  const categoria = str(sp.categoria);
  const q = str(sp.q);
  const ordem = sorts.some((s) => s.value === sp.ordem) ? (sp.ordem as "recent") : "recent";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const [categories, result] = await Promise.all([
    listProductCategories(supabase),
    listProducts(supabase, { categorySlug: categoria, q, page, sort: ordem }),
  ]);
  const params = { categoria, q, ordem: ordem === "recent" ? undefined : ordem };

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader
        eyebrow="Mercado local"
        title="Produtos da ilha"
        description="Compre diretamente aos vendedores da Inhaca. O contacto e o pagamento são combinados entre comprador e vendedor."
        actions={
          <Button asChild>
            <Link href="/dashboard/produtos/novo">
              <Plus /> Vender um produto
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchForm action="/mercado" defaultValue={q} placeholder="Pesquisar produtos…" hidden={{ categoria }} className="flex-1" />
        <form action="/mercado" className="flex gap-2">
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <select name="ordem" defaultValue={ordem} className="h-11 rounded-xl border bg-card px-3 text-sm" aria-label="Ordenar por">
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
          basePath="/mercado"
          param="categoria"
          active={categoria}
          searchParams={params}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
      </div>
      {result.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title={q || categoria ? "Sem resultados" : "Ainda não há produtos à venda"}
          description="Vende peixe, artesanato ou produtos agrícolas? Publique gratuitamente."
          action={
            <Button asChild>
              <Link href="/dashboard/produtos/novo">Publicar produto</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <Pagination page={page} hasMore={result.hasMore} basePath="/mercado" searchParams={params} />
    </div>
  );
}
