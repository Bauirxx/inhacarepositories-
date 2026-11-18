"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { blockUserSchema } from "@/lib/validations/community";
import { isUsernameAvailable } from "@/services/profiles";
import { normalizePhone, safeExternalUrl } from "@/lib/utils";
import { z } from "zod";

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  if (!(await checkRateLimit(supabase, `profile:${user.id}`, RATE_LIMITS.profile.max, RATE_LIMITS.profile.window))) {
    return fail("Demasiadas alterações. Tente novamente mais tarde.");
  }
  if (d.username !== user.profile.username && !(await isUsernameAvailable(supabase, d.username, user.id))) {
    return fail("Este nome de utilizador já está a ser usado.", { username: ["Indisponível."] });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      username: d.username,
      bio: d.bio || null,
      phone: normalizePhone(d.phone),
      whatsapp: normalizePhone(d.whatsapp),
      location: d.location || null,
      website: safeExternalUrl(d.website),
      is_resident: d.is_resident,
      avatar_url: d.avatar_url || null,
    })
    .eq("id", user.id);
  if (error) return fail(dbErrorMessage(error));

  // O papel "resident" acompanha a indicação de habitante.
  if (d.is_resident && !user.roles.includes("resident")) {
    await supabase.rpc("set_my_resident_role", { _is_resident: true });
  } else if (!d.is_resident && user.roles.includes("resident")) {
    await supabase.rpc("set_my_resident_role", { _is_resident: false });
  }

  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function toggleFollow(targetUserId: string, follow: boolean): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  if (!z.string().uuid().safeParse(targetUserId).success) return fail("Utilizador inválido.");
  if (targetUserId === user.id) return fail("Não pode seguir-se a si próprio.");

  const { error } = follow
    ? await supabase.from("follows").upsert({ follower_id: user.id, following_id: targetUserId })
    : await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/perfil/[username]", "page");
  return ok(undefined);
}

export async function toggleBlock(input: { user_id: string }, block: boolean): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = blockUserSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.user_id === user.id) return fail("Não pode bloquear-se a si próprio.");

  const { error } = block
    ? await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: parsed.data.user_id })
    : await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", parsed.data.user_id);
  if (error) return fail(dbErrorMessage(error));
  if (block) {
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", parsed.data.user_id);
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  if (ids && ids.length) {
    if (!ids.every((id) => z.string().uuid().safeParse(id).success)) return fail("Pedido inválido.");
    query = query.in("id", ids);
  } else {
    query = query.eq("is_read", false);
  }
  const { error } = await query;
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/notificacoes");
  return ok(undefined);
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!z.string().uuid().safeParse(id).success) return fail("Pedido inválido.");
  const { error } = await auth.ctx.supabase.from("notifications").delete().eq("id", id).eq("user_id", auth.ctx.user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/notificacoes");
  return ok(undefined);
}
