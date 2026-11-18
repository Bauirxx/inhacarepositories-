import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { CoverImage } from "@/components/shared/cover-image";
import { ActionButton } from "@/components/admin/toggle-action";
import { StatusTabs } from "@/components/admin/status-tabs";
import { createClient } from "@/lib/supabase/server";
import { listProductsForAdmin } from "@/services/products";
import { moderateProduct, setProductFeatured } from "@/features/admin/actions";
import { deleteProduct } from "@/features/products/actions";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export const metadata: Metadata = { title: "Produtos" };

const tabs = [
  { value: "active", label: "Disponíveis" },
  { value: "sold_out", label: "Esgotados" },
  { value: "suspended", label: "Suspensos" },
  { value: "archived", label: "Arquivados" },
  { value: "all", label: "Todos" },
];

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  const sp = await searchParams;
  const estado = (tabs.some((t) => t.value === sp.estado) ? sp.estado : "active") as ProductStatus | "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, hasMore } = await listProductsForAdmin(await createClient(), { status: estado, page });
  return (
    <div>
      <PageHeader title="Produtos" description="Supervisionar o mercado local: suspender anúncios impróprios e destacar produtos." />
      <StatusTabs basePath="/admin/produtos" active={estado} options={tabs} />
      <p className="mb-2 text-sm text-muted-foreground">{total} produto(s)</p>
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <CoverImage src={p.images[0]} alt={p.title} className="size-14 shrink-0 rounded-xl" sizes="56px" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/mercado/${p.id}`} className="font-semibold hover:text-turquoise">
                  {p.title}
                </Link>
                <ProductStatusBadge status={p.status} />
                {p.is_featured ? <Star className="size-4 fill-sand text-sand" aria-label="Destaque" /> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatMoney(p.price, p.currency)} · {p.category?.name} · {p.seller?.full_name} · {formatDateTime(p.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={setProductFeatured.bind(null, { id: p.id, value: !p.is_featured })}>
                {p.is_featured ? "Remover destaque" : "Destacar"}
              </ActionButton>
              {p.status === "suspended" ? (
                <ActionButton action={moderateProduct.bind(null, { id: p.id, suspend: false })} variant="turquoise">
                  Restaurar
                </ActionButton>
              ) : (
                <ActionButton action={moderateProduct.bind(null, { id: p.id, suspend: true })} confirmText="Suspender este anúncio?">
                  Suspender
                </ActionButton>
              )}
              <ActionButton action={deleteProduct.bind(null, p.id)} variant="destructive" confirmText="Eliminar definitivamente?" successText="Eliminado.">
                Eliminar
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} hasMore={hasMore} basePath="/admin/produtos" searchParams={{ estado }} />
    </div>
  );
}
