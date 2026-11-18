import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment, Post, PostCategory } from "@/types";

export const POST_SELECT =
  "*, author:profiles(id, username, full_name, avatar_url), media:post_media(*)";

export const FEED_PAGE_SIZE = 10;

async function decoratePosts(supabase: SupabaseClient, posts: Post[], userId?: string | null): Promise<Post[]> {
  const sorted = posts.map((p) => ({
    ...p,
    media: [...(p.media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
  if (!userId || sorted.length === 0) return sorted;
  const ids = sorted.map((p) => p.id);
  const [{ data: likes }, { data: saved }] = await Promise.all([
    supabase.from("post_reactions").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("saved_posts").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);
  const likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  const savedSet = new Set((saved ?? []).map((s: { post_id: string }) => s.post_id));
  return sorted.map((p) => ({ ...p, liked_by_me: likedSet.has(p.id), saved_by_me: savedSet.has(p.id) }));
}

export interface ListPostsParams {
  category?: PostCategory | null;
  authorId?: string;
  before?: string | null;
  limit?: number;
  userId?: string | null;
  includePinned?: boolean;
}

export async function listPosts(
  supabase: SupabaseClient,
  params: ListPostsParams = {},
): Promise<{ items: Post[]; nextCursor: string | null }> {
  const limit = params.limit ?? FEED_PAGE_SIZE;
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (params.category) query = query.eq("category", params.category);
  if (params.authorId) query = query.eq("author_id", params.authorId);
  if (params.before) query = query.lt("created_at", params.before);

  const { data } = await query;
  let rows = (data ?? []) as Post[];
  const hasMore = rows.length > limit;
  rows = rows.slice(0, limit);

  // Publicações fixadas aparecem no topo da primeira página.
  if (params.includePinned && !params.before && !params.authorId) {
    let pinnedQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("is_hidden", false)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .limit(3);
    if (params.category) pinnedQuery = pinnedQuery.eq("category", params.category);
    const { data: pinned } = await pinnedQuery;
    const pinnedRows = (pinned ?? []) as Post[];
    const pinnedIds = new Set(pinnedRows.map((p) => p.id));
    rows = [...pinnedRows, ...rows.filter((p) => !pinnedIds.has(p.id))];
  }

  const items = await decoratePosts(supabase, rows, params.userId);
  const last = rows[rows.length - 1];
  return { items, nextCursor: hasMore && last ? last.created_at : null };
}

export async function listRecentPosts(supabase: SupabaseClient, limit = 4): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return decoratePosts(supabase, (data ?? []) as Post[]);
}

export async function getPost(supabase: SupabaseClient, id: string, userId?: string | null): Promise<Post | null> {
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const [post] = await decoratePosts(supabase, [data as Post], userId);
  return post;
}

export async function listComments(supabase: SupabaseClient, postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles(id, username, full_name, avatar_url)")
    .eq("post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(500);
  const rows = (data ?? []) as Comment[];
  const byId = new Map<string, Comment>();
  rows.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: Comment[] = [];
  byId.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

export async function listSavedPosts(supabase: SupabaseClient, userId: string): Promise<Post[]> {
  const { data } = await supabase
    .from("saved_posts")
    .select(`post:posts(${POST_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const posts = (data ?? [])
    .map((row: { post: Post | Post[] | null }) => (Array.isArray(row.post) ? row.post[0] : row.post))
    .filter((p: Post | null | undefined): p is Post => Boolean(p));
  return decoratePosts(supabase, posts, userId);
}

export async function listPostsForAdmin(
  supabase: SupabaseClient,
  params: { hidden?: "all" | "visible" | "hidden"; q?: string; page?: number } = {},
): Promise<{ items: Post[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let query = supabase.from("posts").select(POST_SELECT, { count: "exact" });
  if (params.hidden === "hidden") query = query.eq("is_hidden", true);
  if (params.hidden === "visible") query = query.eq("is_hidden", false);
  if (params.q) query = query.ilike("content", `%${params.q.replace(/[%_,]/g, " ")}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Post[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}
