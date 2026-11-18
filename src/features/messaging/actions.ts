"use server";

import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { messageSchema, type MessageInput } from "@/lib/validations/community";
import { listMessages, MESSAGE_SELECT } from "@/services/messaging";
import type { Message } from "@/types";

const uuid = z.string().uuid();

export async function sendMessage(input: MessageInput): Promise<ActionResult<Message>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  if (!(await checkRateLimit(supabase, `msg:${user.id}`, RATE_LIMITS.message.max, RATE_LIMITS.message.window))) {
    return fail("Está a enviar mensagens demasiado depressa.");
  }

  // Imagens do chat têm de estar na pasta da própria conversa.
  if (parsed.data.image_url && !parsed.data.image_url.startsWith(`${parsed.data.conversation_id}/`)) {
    return fail("Imagem inválida.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversation_id,
      sender_id: user.id,
      content: parsed.data.content || null,
      image_url: parsed.data.image_url || null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error || !data) return fail(dbErrorMessage(error));
  return ok(data as Message);
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  // Eliminação lógica: o conteúdo é apagado e a mensagem fica marcada.
  // (A restrição da tabela exige content ou image_url, por isso usamos "".)
  const { data, error } = await auth.ctx.supabase
    .from("messages")
    .update({ is_deleted: true, content: "", image_url: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Não pode apagar esta mensagem.");
  return ok(undefined);
}

export async function startDirectConversation(otherUserId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(otherUserId).success) return fail("Utilizador inválido.");
  const { data, error } = await auth.ctx.supabase.rpc("get_or_create_direct_conversation", {
    _other_user_id: otherUserId,
  });
  if (error || !data) return fail(error?.message ?? "Não foi possível iniciar a conversa.");
  return ok({ id: data as string });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!uuid.safeParse(conversationId).success) return;
  const auth = await getActionContext();
  if (!auth.ok) return;
  await auth.ctx.supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
}

export async function loadOlderMessages(
  conversationId: string,
  before: string,
): Promise<{ items: Message[]; hasMore: boolean }> {
  if (!uuid.safeParse(conversationId).success) return { items: [], hasMore: false };
  if (!z.string().datetime({ offset: true }).safeParse(before).success) return { items: [], hasMore: false };
  const auth = await getActionContext();
  if (!auth.ok) return { items: [], hasMore: false };
  return listMessages(auth.ctx.supabase, conversationId, before);
}

export async function fetchMessage(id: string): Promise<Message | null> {
  if (!uuid.safeParse(id).success) return null;
  const auth = await getActionContext();
  if (!auth.ok) return null;
  const { data } = await auth.ctx.supabase.from("messages").select(MESSAGE_SELECT).eq("id", id).maybeSingle();
  return (data as Message) ?? null;
}
