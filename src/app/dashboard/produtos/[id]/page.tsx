import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { ProductForm } from "@/components/marketplace/product-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getProduct, listProductCategories } from "@/services/products";

export const metadata: Metadata = { title: "Editar produto", robots: { index: false } };

export default async function EditProductPage({ params }: PageProps<"/dashboard/produtos/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/dashboard/produtos/${id}`);
  const supabase = await createClient();
  const [product, categories] = await Promise.all([getProduct(supabase, id), listProductCategories(supabase)]);
  if (!product || (product.seller_id !== user.id && !isModerator(user.roles))) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar produto">
        <div className="mt-2">
          <ProductStatusBadge status={product.status} />
        </div>
      </PageHeader>
      {product.status === "suspended" ? (
        <p className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">Este anúncio foi suspenso pela moderação e não está visível.</p>
      ) : null}
      <ProductForm userId={user.id} categories={categories} product={product} />
    </div>
  );
}
