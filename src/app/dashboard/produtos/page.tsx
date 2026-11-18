import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { CoverImage } from "@/components/shared/cover-image";
import { ProductRowActions } from "@/components/marketplace/product-row-actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyProducts } from "@/services/products";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Os meus produtos", robots: { index: false } };

export default async function MyProductsPage() {
  const user = await requireUser("/dashboard/produtos");
  const products = await listMyProducts(await createClient(), user.id);
  return (
    <div>
      <PageHeader
        title="Os meus produtos"
        description="Gerir fotografias, preços, disponibilidade e contactos."
        actions={
          <Button asChild>
            <Link href="/dashboard/produtos/novo">
              <Plus /> Novo produto
            </Link>
          </Button>
        }
      />
      {products.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title="Ainda não publicou produtos"
          action={
            <Button asChild>
              <Link href="/dashboard/produtos/novo">Publicar produto</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <CoverImage src={p.images[0]} alt={p.title} className="size-16 shrink-0 rounded-xl" sizes="64px" />
              <div className="min-w-0 flex-1">
                <Link href={`/mercado/${p.id}`} className="block truncate font-semibold text-ocean hover:underline">
                  {p.title}
                </Link>
                <p className="text-sm">{formatMoney(p.price, p.currency)}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <ProductStatusBadge status={p.status} />
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5" /> {p.views_count}
                  </span>
                </div>
              </div>
              <ProductRowActions id={p.id} status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
