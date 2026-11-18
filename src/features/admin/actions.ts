"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffActionContext, type ActionContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { isAdmin } from "@/lib/permissions/roles";
import {
  advertisementSchema,
  banUserSchema,
  guidePageSchema,
  hideContentSchema,
  moderationDecisionSchema,
  reportDecisionSchema,
  siteSettingsSchema,
  toggleFlagSchema,
  userRoleChangeSchema,
  type AdvertisementInput,
  type GuidePageInput,
  type ModerationDecisionInput,
  type SiteSettingsInput,
} from "@/lib/validations/admin";
import { groupSchema, type GroupInput } from "@/lib/validations/community";
import { writeAuditLog } from "@/services/admin";
import { islandLocalToIso } from "@/lib/utils";
import type { ReportTarget } from "@/types";

const uuid = z.string().uuid();

async function adminOnly(): Promise<{ ok: true; ctx: ActionContext } | { ok: false; error: string }> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return auth;
  if (!isAdmin(auth.ctx.user.roles)) return { ok: false, error: "Apenas administradores podem fazer esta operação." };
  return auth;
}

function decisionToStatus(decision: ModerationDecisionInput["decision"]) {
  switch (decision) {
    case "approve":
    case "restore":
      return "approved" as const;
    case "reject":
      return "rejected" as const;
    case "suspend":
      return "suspended" as const;
  }
}

/* ------------------------------ Estabelecimentos ------------------------------ */

export async function moderateBusiness(input: ModerationDecisionInput): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = moderationDecisionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const status = decisionToStatus(parsed.data.decision);
  if (parsed.data.decision === "reject" && !parsed.data.reason) {
    return fail("Indique o motivo da rejeição para informar o proprietário.");
  }
  const { data, error } = await supabase
    .from("businesses")
    .update({ status, rejection_reason: status === "rejected" ? parsed.data.reason : null })
    .eq("id", parsed.data.id)
    .select("id, slug, name")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Estabelecimento não encontrado.");
  await writeAuditLog(supabase, user.id, `business.${parsed.data.decision}`, { type: "business", id: data.id }, {
    name: data.name,
    reason: parsed.data.reason || null,
  });
  revalidatePath("/admin/negocios");
  revalidatePath("/servicos");
  revalidatePath(`/servicos/${data.slug}`);
  revalidatePath("/mapa");
  revalidatePath("/");
  return ok(undefined);
}

export async function setBusinessFlag(
  input: { id: string; value: boolean },
  flag: "is_featured" | "is_verified",
): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = toggleFlagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (flag !== "is_featured" && flag !== "is_verified") return fail("Campo inválido.");
  const { supabase, user } = auth.ctx;
  const { data, error } = await supabase
    .from("businesses")
    .update({ [flag]: parsed.data.value })
    .eq("id", parsed.data.id)
    .select("id, slug")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Estabelecimento não encontrado.");
  await writeAuditLog(supabase, user.id, `business.${flag}`, { type: "business", id: data.id }, { value: parsed.data.value });
  revalidatePath("/admin/negocios");
  revalidatePath(`/servicos/${data.slug}`);
  revalidatePath("/");
  return ok(undefined);
}

export async function decideVerification(input: { id: string; approve: boolean; notes?: string }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(input.id).success) return fail("Pedido inválido.");
  const { supabase, user } = auth.ctx;
  const { data, error } = await supabase
    .from("business_verifications")
    .update({ status: input.approve ? "approved" : "rejected", notes: input.notes?.slice(0, 1000) || null })
    .eq("id", input.id)
    .select("id, business_id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Pedido não encontrado.");
  await writeAuditLog(supabase, user.id, input.approve ? "verification.approve" : "verification.reject", {
    type: "business",
    id: data.business_id,
  });
  revalidatePath("/admin/negocios");
  return ok(undefined);
}

/* ------------------------------ Eventos ------------------------------ */

export async function moderateEvent(input: ModerationDecisionInput): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = moderationDecisionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const status = decisionToStatus(parsed.data.decision);
  if (parsed.data.decision === "reject" && !parsed.data.reason) return fail("Indique o motivo da rejeição.");
  const { data, error } = await supabase
    .from("events")
    .update({ status, rejection_reason: status === "rejected" ? parsed.data.reason : null })
    .eq("id", parsed.data.id)
    .select("id, slug, title")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Evento não encontrado.");
  await writeAuditLog(supabase, user.id, `event.${parsed.data.decision}`, { type: "event", id: data.id }, {
    title: data.title,
    reason: parsed.data.reason || null,
  });
  revalidatePath("/admin/eventos");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${data.slug}`);
  revalidatePath("/");
  return ok(undefined);
}

export async function setEventFeatured(input: { id: string; value: boolean }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = toggleFlagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { error } = await auth.ctx.supabase.from("events").update({ is_featured: parsed.data.value }).eq("id", parsed.data.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "event.featured", { type: "event", id: parsed.data.id }, {
    value: parsed.data.value,
  });
  revalidatePath("/admin/eventos");
  revalidatePath("/");
  return ok(undefined);
}

/* ------------------------------ Produtos ------------------------------ */

export async function moderateProduct(input: { id: string; suspend: boolean; reason?: string }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(input.id).success) return fail("Pedido inválido.");
  const { supabase, user } = auth.ctx;
  const { error } = await supabase
    .from("products")
    .update({ status: input.suspend ? "suspended" : "active" })
    .eq("id", input.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(supabase, user.id, input.suspend ? "product.suspend" : "product.restore", {
    type: "product",
    id: input.id,
  }, { reason: input.reason?.slice(0, 500) || null });
  revalidatePath("/admin/produtos");
  revalidatePath("/mercado");
  return ok(undefined);
}

export async function setProductFeatured(input: { id: string; value: boolean }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = toggleFlagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { error } = await auth.ctx.supabase.from("products").update({ is_featured: parsed.data.value }).eq("id", parsed.data.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "product.featured", { type: "product", id: parsed.data.id }, {
    value: parsed.data.value,
  });
  revalidatePath("/admin/produtos");
  revalidatePath("/mercado");
  return ok(undefined);
}

/* ------------------------------ Publicações e comentários ------------------------------ */

export async function setPostHidden(input: { id: string; hidden: boolean; reason?: string }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = hideContentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const { error } = await supabase
    .from("posts")
    .update({ is_hidden: parsed.data.hidden, hidden_reason: parsed.data.hidden ? parsed.data.reason || null : null })
    .eq("id", parsed.data.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(supabase, user.id, parsed.data.hidden ? "post.hide" : "post.unhide", { type: "post", id: parsed.data.id }, {
    reason: parsed.data.reason || null,
  });
  revalidatePath("/admin/publicacoes");
  revalidatePath("/feed");
  return ok(undefined);
}

export async function setPostPinned(input: { id: string; value: boolean }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = toggleFlagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { error } = await auth.ctx.supabase.from("posts").update({ is_pinned: parsed.data.value }).eq("id", parsed.data.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "post.pin", { type: "post", id: parsed.data.id }, {
    value: parsed.data.value,
  });
  revalidatePath("/admin/publicacoes");
  revalidatePath("/feed");
  return ok(undefined);
}

export async function setCommentHidden(input: { id: string; hidden: boolean }): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(input.id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase.from("comments").update({ is_hidden: input.hidden }).eq("id", input.id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, input.hidden ? "comment.hide" : "comment.unhide", {
    type: "comment",
    id: input.id,
  });
  return ok(undefined);
}

/* ------------------------------ Denúncias ------------------------------ */

async function hideTarget(ctx: ActionContext, type: ReportTarget, id: string): Promise<string | null> {
  const { supabase } = ctx;
  switch (type) {
    case "post":
      return (await supabase.from("posts").update({ is_hidden: true, hidden_reason: "Denúncia" }).eq("id", id)).error?.message ?? null;
    case "comment":
      return (await supabase.from("comments").update({ is_hidden: true }).eq("id", id)).error?.message ?? null;
    case "message":
      return (await supabase.from("messages").update({ is_deleted: true, content: "", image_url: null }).eq("id", id)).error?.message ?? null;
    case "business":
      return (await supabase.from("businesses").update({ status: "suspended" }).eq("id", id)).error?.message ?? null;
    case "event":
      return (await supabase.from("events").update({ status: "suspended" }).eq("id", id)).error?.message ?? null;
    case "product":
      return (await supabase.from("products").update({ status: "suspended" }).eq("id", id)).error?.message ?? null;
    case "help_request":
      return (await supabase.from("help_requests").update({ status: "closed" }).eq("id", id)).error?.message ?? null;
    case "profile":
      return null; // Suspensão de contas é feita na gestão de utilizadores (apenas admin).
  }
}

export async function decideReport(input: {
  id: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  resolution_notes?: string;
  hide_target?: boolean;
}): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  const parsed = reportDecisionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;

  const { data: report } = await supabase.from("reports").select("*").eq("id", parsed.data.id).maybeSingle();
  if (!report) return fail("Denúncia não encontrada.");

  if (parsed.data.hide_target) {
    const err = await hideTarget(auth.ctx, report.target_type as ReportTarget, report.target_id as string);
    if (err) return fail(err);
  }

  const { error } = await supabase
    .from("reports")
    .update({
      status: parsed.data.status,
      resolution_notes: parsed.data.resolution_notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return fail(dbErrorMessage(error));

  if (parsed.data.status === "resolved" || parsed.data.status === "dismissed") {
    await supabase.from("notifications").insert({
      user_id: report.reporter_id,
      type: "report_resolved",
      title:
        parsed.data.status === "resolved"
          ? "A sua denúncia foi analisada e foram tomadas medidas."
          : "A sua denúncia foi analisada e arquivada.",
      body: parsed.data.resolution_notes || null,
      actor_id: user.id,
    });
  }

  await writeAuditLog(supabase, user.id, `report.${parsed.data.status}`, { type: "report", id: parsed.data.id }, {
    target_type: report.target_type,
    target_id: report.target_id,
    hidden: parsed.data.hide_target,
  });
  revalidatePath("/admin/denuncias");
  return ok(undefined);
}

/* ------------------------------ Utilizadores ------------------------------ */

export async function changeUserRole(input: {
  user_id: string;
  role: string;
  action: "grant" | "revoke";
}): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = userRoleChangeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  if (parsed.data.user_id === user.id && parsed.data.role === "admin" && parsed.data.action === "revoke") {
    return fail("Não pode remover o seu próprio papel de administrador.");
  }
  const { error } =
    parsed.data.action === "grant"
      ? await supabase
          .from("user_roles")
          .upsert({ user_id: parsed.data.user_id, role: parsed.data.role, granted_by: user.id }, { onConflict: "user_id,role" })
      : await supabase.from("user_roles").delete().eq("user_id", parsed.data.user_id).eq("role", parsed.data.role);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(supabase, user.id, `user.role.${parsed.data.action}`, { type: "profile", id: parsed.data.user_id }, {
    role: parsed.data.role,
  });
  revalidatePath("/admin/utilizadores");
  revalidatePath(`/admin/utilizadores/${parsed.data.user_id}`);
  return ok(undefined);
}

export async function setUserBanned(input: { user_id: string; banned: boolean; reason?: string }): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = banUserSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  if (parsed.data.user_id === user.id) return fail("Não pode suspender a sua própria conta.");

  const { error } = await supabase.from("profiles").update({ is_banned: parsed.data.banned }).eq("id", parsed.data.user_id);
  if (error) return fail(dbErrorMessage(error));

  // Com a chave privilegiada configurada, bloqueia também o login (Supabase Auth).
  const admin = createAdminClient();
  let authUpdated = false;
  if (admin) {
    const res = await admin.auth.admin.updateUserById(parsed.data.user_id, {
      ban_duration: parsed.data.banned ? "876000h" : "none",
    });
    authUpdated = !res.error;
  }

  await writeAuditLog(supabase, user.id, parsed.data.banned ? "user.ban" : "user.unban", {
    type: "profile",
    id: parsed.data.user_id,
  }, { reason: parsed.data.reason || null, auth_ban_applied: authUpdated });
  revalidatePath("/admin/utilizadores");
  revalidatePath(`/admin/utilizadores/${parsed.data.user_id}`);
  return ok(undefined);
}

/* ------------------------------ Publicidade ------------------------------ */

export async function saveAdvertisement(input: AdvertisementInput, id?: string): Promise<ActionResult<{ id: string }>> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = advertisementSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const row = {
    title: parsed.data.title,
    advertiser_name: parsed.data.advertiser_name || null,
    image_url: parsed.data.image_url || null,
    link_url: parsed.data.link_url || null,
    placement: parsed.data.placement,
    starts_at: parsed.data.starts_at ? islandLocalToIso(parsed.data.starts_at) : null,
    ends_at: parsed.data.ends_at ? islandLocalToIso(parsed.data.ends_at) : null,
    is_active: parsed.data.is_active,
  };
  let adId = id;
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
    const { error } = await supabase.from("advertisements").update(row).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { data, error } = await supabase
      .from("advertisements")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return fail(dbErrorMessage(error));
    adId = data.id as string;
  }
  await writeAuditLog(supabase, user.id, id ? "ad.update" : "ad.create", { type: "advertisement", id: adId! });
  revalidatePath("/admin/publicidade");
  revalidatePath("/");
  return ok({ id: adId! });
}

export async function deleteAdvertisement(id: string): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase.from("advertisements").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "ad.delete", { type: "advertisement", id });
  revalidatePath("/admin/publicidade");
  revalidatePath("/");
  return ok(undefined);
}

/* ------------------------------ Guia turístico ------------------------------ */

export async function saveGuidePage(input: GuidePageInput, id?: string): Promise<ActionResult<{ id: string; slug: string }>> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = guidePageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const row = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt || null,
    content: parsed.data.content,
    cover_url: parsed.data.cover_url || null,
    icon: parsed.data.icon || null,
    sort_order: parsed.data.sort_order,
    is_published: parsed.data.is_published,
    updated_by: user.id,
  };
  let pageId = id;
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
    const { error } = await supabase.from("guide_pages").update(row).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { data, error } = await supabase.from("guide_pages").insert(row).select("id").single();
    if (error || !data) return fail(dbErrorMessage(error));
    pageId = data.id as string;
  }
  await writeAuditLog(supabase, user.id, id ? "guide.update" : "guide.create", { type: "guide_page", id: pageId! }, {
    slug: parsed.data.slug,
  });
  revalidatePath("/descobrir", "layout");
  revalidatePath("/admin/guia");
  return ok({ id: pageId!, slug: parsed.data.slug });
}

export async function deleteGuidePage(id: string): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase.from("guide_pages").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "guide.delete", { type: "guide_page", id });
  revalidatePath("/descobrir", "layout");
  revalidatePath("/admin/guia");
  return ok(undefined);
}

/* ------------------------------ Grupos ------------------------------ */

export async function saveGroup(input: GroupInput, id?: string): Promise<ActionResult<{ id: string }>> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const row = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    topic: parsed.data.topic || null,
    icon: parsed.data.icon || null,
    is_default: parsed.data.is_default,
  };
  let groupId = id;
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
    const { error } = await supabase.from("groups").update(row).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { data, error } = await supabase
      .from("groups")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return fail(dbErrorMessage(error));
    groupId = data.id as string;
  }
  await writeAuditLog(supabase, user.id, id ? "group.update" : "group.create", { type: "group", id: groupId! });
  revalidatePath("/comunidade", "layout");
  revalidatePath("/admin/comunidade");
  return ok({ id: groupId! });
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { data: group } = await auth.ctx.supabase.from("groups").select("conversation_id").eq("id", id).maybeSingle();
  const { error } = await auth.ctx.supabase.from("groups").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (group?.conversation_id) {
    await auth.ctx.supabase.from("conversations").delete().eq("id", group.conversation_id);
  }
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "group.delete", { type: "group", id });
  revalidatePath("/comunidade", "layout");
  revalidatePath("/admin/comunidade");
  return ok(undefined);
}

export async function deleteMessageAsStaff(id: string): Promise<ActionResult> {
  const auth = await getStaffActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase
    .from("messages")
    .update({ is_deleted: true, content: "", image_url: null })
    .eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(auth.ctx.supabase, auth.ctx.user.id, "message.delete", { type: "message", id });
  return ok(undefined);
}

/* ------------------------------ Configurações ------------------------------ */

export async function saveSiteSettings(input: SiteSettingsInput): Promise<ActionResult> {
  const auth = await adminOnly();
  if (!auth.ok) return fail(auth.error);
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { supabase, user } = auth.ctx;
  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: value ?? "",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return fail(dbErrorMessage(error));
  await writeAuditLog(supabase, user.id, "settings.update", { type: "site_settings", id: "global" });
  revalidatePath("/", "layout");
  return ok(undefined);
}
