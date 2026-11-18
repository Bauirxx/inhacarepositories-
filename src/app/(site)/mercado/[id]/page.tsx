import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactButtons } from "@/components/shared/contact-buttons";
import { ProductStatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReportDialog } from "@/components/shared/report-dialog";
import { RelativeTime } from "@/components/shared/relative-time";
import { ViewTracker } from "@/components/shared/view-tracker";
import { MessageUserButton } from "@/components/shared/message-user-button";
import { ProductGallery } from "@/components/marketplace/product-gallery";
import { ProductCard } from "@/components/marketplace/product-card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProduct, listProducts } from "@/services/products";
import { formatMoney, truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/mercado/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return { title: "Produto" };
  const p = await getProduct(await createClient(), id);
  if (!p) return { title: "Produto não encontrado" };
  const description = truncate(p.description ?? `${p.title} à venda na Ilha de Inhaca`, 160);
  return {
    title: `${p.title} · ${formatMoney(p.price, p.currency)}`,
    description,
    alternates: { canonical: `/mercado/${p.id}` },
    openGraph: { title: p.title, description, images: p.images[0] ? [p.images[0]] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/mercado/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const product = await getProduct(supabase, id);
  if (!product) notFound();
  const isSeller = user?.id === product.seller_id;
  const related = (
    await listProducts(supabase, { categorySlug: product.category?.slug, pageSize: 5 })
  ).items.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="container-page py-6 sm:py-10">
      {product.status === "active" || product.status === "sold_out" ? <ViewTracker kind="product" id={product.id} /> : null}
      <Link href="/mercado" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ocean">
        <ArrowLeft className="size-4" /> Mercado
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/mercado?categoria=${product.category?.slug ?? ""}`} className="text-sm font-semibold text-turquoise">
              {product.category?.name}
            </Link>
            <ProductStatusBadge status={product.status} />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-ocean sm:text-3xl">{product.title}</h1>
          <p className="mt-3 text-3xl font-extrabold text-ocean">
            {formatMoney(product.price, product.currency)}
            {product.unit && product.price !== null ? <span className="text-base font-medium text-muted-foreground"> / {product.unit}</span> : null}
          </p>
          {product.is_negotiable ? <p className="text-sm text-muted-foreground">Preço negociável</p> : null}
          {product.location ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-turquoise" /> {product.location}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Publicado <RelativeTime value={product.created_at} />
          </p>

          <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
            <Link href={`/perfil/${product.seller?.username ?? ""}`} className="flex items-center gap-3">
              <UserAvatar name={product.seller?.full_name} src={product.seller?.avatar_url} />
              <span>
                <span className="block text-xs text-muted-foreground">Vendedor</span>
                <span className="font-semibold text-ocean">{product.seller?.full_name}</span>
              </span>
            </Link>
            {!isSeller ? (
              <div className="mt-4 space-y-2">
                <ContactButtons
                  phone={product.contact_phone}
                  whatsapp={product.contact_whatsapp}
                  message={`Olá! Tenho interesse no produto "${product.title}" que vi no INHACA CONNECT.`}
                />
                <MessageUserButton userId={product.seller_id} isLoggedIn={Boolean(user)} label="Mensagem na plataforma" className="w-full" />
              </div>
            ) : (
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/dashboard/produtos/${product.id}`}>
                  <Pencil /> Editar produto
                </Link>
              </Button>
            )}
          </div>

          {product.description ? (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-ocean">Descrição</h2>
              <p className="mt-2 leading-relaxed whitespace-pre-line">{product.description}</p>
            </section>
          ) : null}
          <p className="mt-6 rounded-xl bg-sand-light p-3 text-xs text-amber-900">
            O INHACA CONNECT é uma plataforma de divulgação. Combine o pagamento e a entrega diretamente com o vendedor e
            verifique o produto antes de pagar.
          </p>
          {user && !isSeller ? (
            <div className="mt-2">
              <ReportDialog targetType="product" targetId={product.id} />
            </div>
          ) : null}
        </div>
      </div>
      {related.length ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-ocean">Produtos semelhantes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
