"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { commentSchema, postSchema, type CommentInput, type PostInput } from "@/lib/validations/post";
import { listPosts, getPost } from "@/services/posts";
import { listComments } from "@/services/posts";
import type { Comment, Post, PostCategory } from "@/types";

const uuid = z.string().uuid();

export async function createPost(input: PostInput): Promise<ActionResult<{ id: string }>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  if (!(await checkRateLimit(supabase, `post:${user.id}`, RATE_LIMITS.post.max, RATE_LIMITS.post.window))) {
    return fail("Publicou muitas vezes em pouco tempo. Aguarde alguns minutos.");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      content: d.content,
      category: d.category,
      location: d.location || null,
      business_id: d.business_id ?? null,
      event_id: d.event_id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error));

  if (d.media.length) {
    const { error: mediaError } = await supabase.from("post_media").insert(
      d.media.map((m, i) => ({
        post_id: data.id,
        url: m.url,
        type: m.type,
        width: m.width ?? null,
        height: m.height ?? null,
        sort_order: i,
      })),
    );
    if (mediaError) {
      await supabase.from("posts").delete().eq("id", data.id);
      return fail(dbErrorMessage(mediaError));
    }
  }

  revalidatePath("/feed");
  revalidatePath("/");
  return ok({ id: data.id as string });
}

export async function updatePostContent(id: string, content: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const text = z.string().trim().min(1, "A publicação não pode ficar vazia.").max(5000).safeParse(content);
  if (!text.success) return fromZodError(text.error);
  const { error, count } = await auth.ctx.supabase
    .from("posts")
    .update({ content: text.data }, { count: "exact" })
    .eq("id", id)
    .eq("author_id", auth.ctx.user.id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode editar esta publicação.");
  revalidatePath(`/feed/${id}`);
  revalidatePath("/feed");
  return ok(undefined);
}

export async function deletePost(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("posts").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode eliminar esta publicação.");
  revalidatePath("/feed");
  revalidatePath("/");
  return ok(undefined);
}

export async function toggleLike(postId: string, like: boolean): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(postId).success) return fail("Pedido inválido.");
  const { supabase, user } = auth.ctx;
  const { error } = like
    ? await supabase.from("post_reactions").upsert({ post_id: postId, user_id: user.id, reaction: "like" })
    : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  return ok(undefined);
}

export async function toggleSave(postId: string, save: boolean): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(postId).success) return fail("Pedido inválido.");
  const { supabase, user } = auth.ctx;
  const { error } = save
    ? await supabase.from("saved_posts").upsert({ post_id: postId, user_id: user.id })
    : await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/guardados");
  return ok(undefined);
}

export async function registerShare(postId: string): Promise<void> {
  if (!uuid.safeParse(postId).success) return;
  const supabase = await createClient();
  await supabase.rpc("increment_post_shares", { _post_id: postId });
}

export async function addComment(input: CommentInput): Promise<ActionResult<Comment>> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  const { supabase, user } = auth.ctx;
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkRateLimit(supabase, `comment:${user.id}`, RATE_LIMITS.comment.max, RATE_LIMITS.comment.window))) {
    return fail("Demasiados comentários. Aguarde um pouco.");
  }
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: parsed.data.post_id,
      parent_id: parsed.data.parent_id ?? null,
      content: parsed.data.content,
      author_id: user.id,
    })
    .select("*, author:profiles(id, username, full_name, avatar_url)")
    .single();
  if (error || !data) return fail(dbErrorMessage(error));
  revalidatePath(`/feed/${parsed.data.post_id}`);
  return ok({ ...(data as Comment), replies: [] });
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const auth = await getActionContext();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Pedido inválido.");
  const { error, count } = await auth.ctx.supabase.from("comments").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Não pode eliminar este comentário.");
  return ok(undefined);
}

/** Paginação progressiva do feed (chamada a partir do cliente). */
export async function loadMorePosts(params: {
  category?: PostCategory | null;
  before: string;
  authorId?: string;
}): Promise<{ items: Post[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const category = params.category && z.string().max(20).safeParse(params.category).success ? params.category : null;
  if (!z.string().datetime({ offset: true }).safeParse(params.before).success) return { items: [], nextCursor: null };
  return listPosts(supabase, {
    category,
    before: params.before,
    authorId: params.authorId && uuid.safeParse(params.authorId).success ? params.authorId : undefined,
    userId: user?.id ?? null,
  });
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  if (!uuid.safeParse(postId).success) return [];
  const supabase = await createClient();
  return listComments(supabase, postId);
}

export async function fetchPost(postId: string): Promise<Post | null> {
  if (!uuid.safeParse(postId).success) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return getPost(supabase, postId, user?.id ?? null);
}
