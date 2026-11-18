"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  businessSchema,
  reviewSchema,
  verificationRequestSchema,
  type BusinessInput,
  type ReviewInput,
  type VerificationRequestInput,
} from "@/lib/validations/business";
import { normalizePhone, safeExternalUrl, uniqueSlug } from "@/lib/utils";

function toRow(d: BusinessInput) {
  return {
    name: d.name,
    category_id: d.category_id,
    short_description: d.short_description || null,
    description: d.description || null,
    phone: normalizePhone(d.phone),
    whatsapp: normalizePhone(d.whatsapp),
    email: d.email || null,
    website: safeExternalUrl(d.website),
    address: d.address || null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    opening_hours: d.opening_hours ?? {},
    price_info: d.price_info || null,
    amenities: d.amenities ?? [],
    logo_url: d.logo_url || null,
    cover_url: d.cover_url || null,
  };
}

export async function saveBusiness(
  input: BusinessInput,
  businessId?: string,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  let id = businessId;
  let slug: string;

  if (id) {
    if (!z.string().uuid().safeParse(id).success) return fail("Estabelecimento inválido.");
    const { data: existing } = await supabase.from("businesses").select("id, owner_id, slug").eq("id", id).maybeSingle();
    if (!existing) return fail("Estabelecimento não encontrado.");
    if (existing.owner_id !== user.id && !user.roles.some((r) => r === "admin" || r === "moderator")) {
      return fail("Não tem permissões para editar este estabelecimento.");
    }
    const { error } = await supabase.from("businesses").update(toRow(d)).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
    slug = existing.slug;
  } else {
    if (!(await checkRateLimit(supabase, `business:${user.id}`, RATE_LIMITS.business.max, RATE_LIMITS.business.window))) {
      return fail("Atingiu o limite de submissões. Tente mais tarde.");
    }
    slug = uniqueSlug(d.name);
    const { data, error } = await supabase
      .from("businesses")
      .insert({ ...toRow(d), slug, owner_id: user.id })
      .select("id, slug")
      .single();
    if (error || !data) return fail(dbErrorMessage(error));
    id = data.id as string;
  }

  // Serviços: substitui a lista completa.
  await supabase.from("business_services").delete().eq("business_id", id);
  if (d.services.length) {
    const { error } = await supabase.from("business_services").insert(
      d.services.map((s, i) => ({
        business_id: id,
        name: s.name,
        description: s.description || null,
        price: s.price || null,
        sort_order: i,
      })),
    );
    if (error) return fail(dbErrorMessage(error));
  }

  // Galeria: substitui a lista completa.
  await supabase.from("business_media").delete().eq("business_id", id);
  if (d.gallery.length) {
    const { error } = await supabase.from("business_media").insert(
      d.gallery.map((url, i) => ({ business_id: id, url, type: "image", sort_order: i })),
    );
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/servicos");
  revalidatePath(`/servicos/${slug}`);
  revalidatePath("/mapa");
  revalidatePath("/dashboard/negocios");
  return ok({ id: id!, slug });
}

export async function deleteBusiness(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("businesses").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não tem permissões para eliminar este estabelecimento.");
  revalidatePath("/servicos");
  revalidatePath("/mapa");
  revalidatePath("/dashboard/negocios");
  return ok(undefined);
}

export async function saveReview(input: ReviewInput): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkRateLimit(supabase, `review:${user.id}`, RATE_LIMITS.review.max, RATE_LIMITS.review.window))) {
    return fail("Demasiadas avaliações. Tente mais tarde.");
  }
  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id, slug")
    .eq("id", parsed.data.business_id)
    .maybeSingle();
  if (!business) return fail("Estabelecimento não encontrado.");
  if (business.owner_id === user.id) return fail("Não pode avaliar o seu próprio estabelecimento.");

  const { error } = await supabase.from("reviews").upsert(
    {
      business_id: parsed.data.business_id,
      author_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
    { onConflict: "business_id,author_id" },
  );
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/servicos/${business.slug}`);
  return ok(undefined);
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase.from("reviews").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/servicos", "layout");
  return ok(undefined);
}

export async function requestVerification(input: VerificationRequestInput): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = verificationRequestSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { data: pending } = await supabase
    .from("business_verifications")
    .select("id")
    .eq("business_id", parsed.data.business_id)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) return fail("Já existe um pedido de verificação pendente.");

  const { error } = await supabase.from("business_verifications").insert({
    business_id: parsed.data.business_id,
    requested_by: user.id,
    notes: parsed.data.notes || null,
    document_url: parsed.data.document_url || null,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/negocios/${parsed.data.business_id}`);
  return ok(undefined);
}

export async function trackBusinessView(id: string): Promise<void> {
  if (!z.string().uuid().safeParse(id).success) return;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.rpc("increment_business_views", { _business_id: id });
}
