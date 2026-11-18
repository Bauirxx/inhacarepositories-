"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { attendSchema, eventSchema, type EventInput } from "@/lib/validations/event";
import { islandLocalToIso, normalizePhone, uniqueSlug } from "@/lib/utils";

function toRow(d: EventInput) {
  return {
    title: d.title,
    description: d.description || null,
    category: d.category,
    cover_url: d.cover_url || null,
    starts_at: islandLocalToIso(d.starts_at),
    ends_at: d.ends_at ? islandLocalToIso(d.ends_at) : null,
    location_name: d.location_name || null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    business_id: d.business_id ?? null,
    contact_phone: normalizePhone(d.contact_phone),
    contact_whatsapp: normalizePhone(d.contact_whatsapp),
    price_info: d.price_info || null,
  };
}

export async function saveEvent(input: EventInput, eventId?: string): Promise<ActionResult<{ id: string; slug: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  if (eventId) {
    if (!z.string().uuid().safeParse(eventId).success) return fail("Evento inválido.");
    const { data, error } = await supabase
      .from("events")
      .update(toRow(parsed.data))
      .eq("id", eventId)
      .select("id, slug")
      .maybeSingle();
    if (error) return fail(dbErrorMessage(error));
    if (!data) return fail("Não tem permissões para editar este evento.");
    revalidatePath("/agenda");
    revalidatePath(`/agenda/${data.slug}`);
    revalidatePath("/dashboard/eventos");
    return ok({ id: data.id as string, slug: data.slug as string });
  }

  if (!(await checkRateLimit(supabase, `event:${user.id}`, RATE_LIMITS.event.max, RATE_LIMITS.event.window))) {
    return fail("Atingiu o limite de submissões. Tente mais tarde.");
  }
  const slug = uniqueSlug(parsed.data.title);
  const { data, error } = await supabase
    .from("events")
    .insert({ ...toRow(parsed.data), slug, organizer_id: user.id })
    .select("id, slug")
    .single();
  if (error || !data) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/eventos");
  return ok({ id: data.id as string, slug: data.slug as string });
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("events").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode eliminar este evento.");
  revalidatePath("/agenda");
  revalidatePath("/dashboard/eventos");
  return ok(undefined);
}

export async function setAttendance(input: { event_id: string; status: "going" | "interested" | null }): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = attendSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const { error } = parsed.data.status
    ? await supabase
        .from("event_attendees")
        .upsert({ event_id: parsed.data.event_id, user_id: user.id, status: parsed.data.status })
    : await supabase.from("event_attendees").delete().eq("event_id", parsed.data.event_id).eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/agenda", "layout");
  return ok(undefined);
}
