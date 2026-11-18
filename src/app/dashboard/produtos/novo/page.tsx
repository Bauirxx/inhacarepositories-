import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/marketplace/product-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listProductCategories } from "@/services/products";

export const metadata: Metadata = { title: "Publicar produto", robots: { index: false } };

export default async function NewProductPage() {
  const user = await requireUser("/dashboard/produtos/novo");
  const categories = await listProductCategories(await createClient());
  return (
    <div className="max-w-3xl">
      <PageHeader title="Publicar produto" description="O produto fica visível de imediato no mercado. A moderação pode suspender anúncios que violem as regras." />
      <ProductForm
        userId={user.id}
        categories={categories}
        defaults={{ phone: user.profile.phone, whatsapp: user.profile.whatsapp, location: user.profile.location }}
      />
    </div>
  );
}
