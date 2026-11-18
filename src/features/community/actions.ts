"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { helpRequestSchema, reportSchema, type HelpRequestInput, type ReportInput } from "@/lib/validations/community";
import { normalizePhone } from "@/lib/utils";

const uuid = z.string().uuid();

export async function submitReport(input: ReportInput): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkRateLimit(supabase, `report:${user.id}`, RATE_LIMITS.report.max, RATE_LIMITS.report.window))) {
    return fail("Enviou demasiadas denúncias. Tente mais tarde.");
  }
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) {
    if (error.code === "23505") return fail("Já denunciou este conteúdo. A moderação está a analisar.");
    return fail(dbErrorMessage(error));
  }
  return ok(undefined);
}

export async function saveHelpRequest(input: HelpRequestInput, id?: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = helpRequestSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const row = {
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location || null,
    contact_phone: normalizePhone(parsed.data.contact_phone),
    contact_whatsapp: normalizePhone(parsed.data.contact_whatsapp),
  };
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
    const { data, error } = await supabase.from("help_requests").update(row).eq("id", id).select("id").maybeSingle();
    if (error) return fail(dbErrorMessage(error));
    if (!data) return fail("Não pode editar este pedido.");
    revalidatePath("/comunidade/ajuda");
    return ok({ id });
  }
  if (!(await checkRateLimit(supabase, `help:${user.id}`, RATE_LIMITS.help.max, RATE_LIMITS.help.window))) {
    return fail("Atingiu o limite de pedidos. Tente mais tarde.");
  }
  const { data, error } = await supabase
    .from("help_requests")
    .insert({ ...row, author_id: user.id })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error));
  revalidatePath("/comunidade/ajuda");
  revalidatePath("/comunidade");
  return ok({ id: data.id as string });
}

export async function setHelpRequestStatus(id: string, status: "open" | "resolved" | "closed"): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success || !["open", "resolved", "closed"].includes(status)) return fail("Pedido inválido.");
  const { data, error } = await auth.ctx.supabase
    .from("help_requests")
    .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Não pode alterar este pedido.");
  revalidatePath("/comunidade/ajuda");
  return ok(undefined);
}

export async function deleteHelpRequest(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("help_requests").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode eliminar este pedido.");
  revalidatePath("/comunidade/ajuda");
  return ok(undefined);
}

export async function joinGroup(groupId: string, join: boolean): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(groupId).success) return fail("Grupo inválido.");
  const { supabase, user } = auth.ctx;
  const { error } = join
    ? await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id })
    : await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  if (error && error.code !== "23505") return fail(dbErrorMessage(error));
  revalidatePath("/comunidade", "layout");
  return ok(undefined);
}
