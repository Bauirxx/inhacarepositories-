"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { saveProduct } from "@/features/products/actions";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import type { Product, ProductCategory } from "@/types";

export function ProductForm({
  userId,
  categories,
  product,
  defaults,
}: {
  userId: string;
  categories: ProductCategory[];
  product?: Product | null;
  defaults?: { phone?: string | null; whatsapp?: string | null; location?: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      title: product?.title ?? "",
      description: product?.description ?? "",
      category_id: product?.category_id ?? "",
      price: product?.price ?? null,
      unit: product?.unit ?? "",
      is_negotiable: product?.is_negotiable ?? false,
      images: product?.images ?? [],
      location: product?.location ?? defaults?.location ?? "",
      contact_phone: product?.contact_phone ?? defaults?.phone ?? "",
      contact_whatsapp: product?.contact_whatsapp ?? defaults?.whatsapp ?? "",
      status: product && product.status !== "suspended" ? product.status : "active",
    },
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(
        (values) =>
          startTransition(async () => {
            const res = await saveProduct(values, product?.id);
            if (res.ok) {
              toast.success(product ? "Produto atualizado." : "Produto publicado!");
              router.push("/dashboard/produtos");
              router.refresh();
            } else toast.error(res.error);
          }),
        () => toast.error("Verifique os campos assinalados."),
      )}
    >
      <FormSection title="Fotografias" description="Até 8 fotografias. A primeira é a principal.">
        <ImageUploader
          bucket="product-media"
          folder={userId}
          value={form.watch("images") ?? []}
          onChange={(u) => form.setValue("images", u, { shouldDirty: true })}
          max={8}
          aspect="square"
        />
      </FormSection>
      <FormSection title="Produto">
        <FormField id="title" label="Nome do produto" error={errors.title?.message} required>
          <Input id="title" placeholder="Ex.: Camarão fresco" {...form.register("title")} />
        </FormField>
        <FormField id="category_id" label="Categoria" error={errors.category_id?.message} required>
          <select id="category_id" {...form.register("category_id")} className="h-11 rounded-xl border bg-card px-3">
            <option value="">Escolha…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="description" label="Descrição" error={errors.description?.message}>
          <Textarea id="description" rows={4} {...form.register("description")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="price" label="Preço (MZN)" hint="Deixe vazio para 'sob consulta'." error={errors.price?.message}>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              {...form.register("price", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
            />
          </FormField>
          <FormField id="unit" label="Unidade" hint="Ex.: kg, unidade, dúzia" error={errors.unit?.message}>
            <Input id="unit" {...form.register("unit")} />
          </FormField>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3">
          <span className="text-sm font-medium">Preço negociável</span>
          <Switch checked={form.watch("is_negotiable")} onCheckedChange={(v) => form.setValue("is_negotiable", v)} />
        </label>
        <FormField id="status" label="Disponibilidade">
          <select id="status" {...form.register("status")} className="h-11 rounded-xl border bg-card px-3">
            <option value="active">Disponível</option>
            <option value="sold_out">Esgotado</option>
            <option value="archived">Arquivado (oculto)</option>
          </select>
        </FormField>
      </FormSection>
      <FormSection title="Contacto e local">
        <FormField id="location" label="Local" error={errors.location?.message}>
          <Input id="location" placeholder="Ex.: Mercado da vila" {...form.register("location")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact_whatsapp" label="WhatsApp" error={errors.contact_whatsapp?.message}>
            <Input id="contact_whatsapp" type="tel" inputMode="tel" {...form.register("contact_whatsapp")} />
          </FormField>
          <FormField id="contact_phone" label="Telefone" error={errors.contact_phone?.message}>
            <Input id="contact_phone" type="tel" inputMode="tel" {...form.register("contact_phone")} />
          </FormField>
        </div>
      </FormSection>
      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : product ? "Guardar alterações" : "Publicar produto"}
        </Button>
      </div>
    </form>
  );
}
