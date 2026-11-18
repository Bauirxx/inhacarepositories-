"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { normalizePhone } from "@/lib/utils";

function toRow(d: ProductInput) {
  return {
    title: d.title,
    description: d.description || null,
    category_id: d.category_id,
    price: d.price ?? null,
    unit: d.unit || null,
    is_negotiable: d.is_negotiable,
    images: d.images,
    location: d.location || null,
    contact_phone: normalizePhone(d.contact_phone),
    contact_whatsapp: normalizePhone(d.contact_whatsapp),
    status: d.status,
  };
}

export async function saveProduct(input: ProductInput, productId?: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  if (productId) {
    if (!z.string().uuid().safeParse(productId).success) return fail("Produto inválido.");
    const { data, error } = await supabase
      .from("products")
      .update(toRow(parsed.data))
      .eq("id", productId)
      .select("id")
      .maybeSingle();
    if (error) return fail(dbErrorMessage(error));
    if (!data) return fail("Não tem permissões para editar este produto.");
    revalidatePath("/mercado");
    revalidatePath(`/mercado/${productId}`);
    revalidatePath("/dashboard/produtos");
    return ok({ id: productId });
  }

  if (!(await checkRateLimit(supabase, `product:${user.id}`, RATE_LIMITS.product.max, RATE_LIMITS.product.window))) {
    return fail("Atingiu o limite de publicações. Tente mais tarde.");
  }
  const { data, error } = await supabase
    .from("products")
    .insert({ ...toRow(parsed.data), seller_id: user.id })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error));
  revalidatePath("/mercado");
  revalidatePath("/dashboard/produtos");
  return ok({ id: data.id as string });
}

export async function setProductStatus(id: string, status: "active" | "sold_out" | "archived"): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  if (!["active", "sold_out", "archived"].includes(status)) return fail("Estado inválido.");
  const { data, error } = await auth.ctx.supabase
    .from("products")
    .update({ status })
    .eq("id", id)
    .eq("seller_id", auth.ctx.user.id)
    .select("id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Não pode alterar este produto.");
  revalidatePath("/mercado");
  revalidatePath("/dashboard/produtos");
  return ok(undefined);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("products").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode eliminar este produto.");
  revalidatePath("/mercado");
  revalidatePath("/dashboard/produtos");
  return ok(undefined);
}

export async function trackProductView(id: string): Promise<void> {
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.rpc("increment_product_views", { _product_id: id });
}
