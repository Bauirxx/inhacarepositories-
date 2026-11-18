import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, ConversationSummary, Group, Message, ProfileSummary } from "@/types";

export const MESSAGE_SELECT = "*, sender:profiles(id, username, full_name, avatar_url)";
export const MESSAGES_PAGE_SIZE = 40;

export async function listMyConversations(supabase: SupabaseClient): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) return [];
  return (data ?? []) as ConversationSummary[];
}

export interface ConversationDetail {
  conversation: Conversation;
  group: Group | null;
  otherUser: ProfileSummary | null;
  members: ProfileSummary[];
}

export async function getConversationDetail(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<ConversationDetail | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const conv = conversation as Conversation;
  let group: Group | null = null;
  let otherUser: ProfileSummary | null = null;
  let members: ProfileSummary[] = [];

  if (conv.type === "group") {
    const { data } = await supabase.from("groups").select("*").eq("conversation_id", conv.id).maybeSingle();
    group = (data as Group) ?? null;
  }
  if (conv.type !== "general") {
    const { data } = await supabase
      .from("conversation_members")
      .select("user:profiles(id, username, full_name, avatar_url)")
      .eq("conversation_id", conv.id)
      .limit(200);
    members = (data ?? [])
      .map((r: { user: ProfileSummary | ProfileSummary[] | null }) => (Array.isArray(r.user) ? r.user[0] : r.user))
      .filter((u: ProfileSummary | null | undefined): u is ProfileSummary => Boolean(u));
    if (conv.type === "direct") {
      otherUser = members.find((m) => m.id !== userId) ?? null;
    }
  }
  return { conversation: conv, group, otherUser, members };
}

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
  before?: string | null,
  limit = MESSAGES_PAGE_SIZE,
): Promise<{ items: Message[]; hasMore: boolean }> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (before) query = query.lt("created_at", before);
  const { data } = await query;
  const rows = ((data ?? []) as Message[]).reverse();
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(1) : rows, hasMore };
}

export async function listGroups(supabase: SupabaseClient, userId?: string | null): Promise<Group[]> {
  const { data } = await supabase
    .from("groups")
    .select("*")
    .order("is_default", { ascending: false })
    .order("members_count", { ascending: false })
    .order("name");
  const groups = (data ?? []) as Group[];
  if (!userId || groups.length === 0) return groups;
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  const set = new Set((memberships ?? []).map((m: { group_id: string }) => m.group_id));
  return groups.map((g) => ({ ...g, is_member: set.has(g.id) }));
}

export async function getGroupBySlug(
  supabase: SupabaseClient,
  slug: string,
  userId?: string | null,
): Promise<Group | null> {
  const { data } = await supabase.from("groups").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const group = data as Group;
  if (userId) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group.id)
      .eq("user_id", userId)
      .maybeSingle();
    group.is_member = Boolean(membership);
  }
  return group;
}

export async function getGeneralConversationId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.rpc("general_conversation_id");
  return (data as string | null) ?? null;
}

export async function getUnreadMessagesCount(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.rpc("my_unread_messages_count");
  return Number(data ?? 0);
}

export async function listBlockedUsers(supabase: SupabaseClient, userId: string): Promise<ProfileSummary[]> {
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked:profiles!user_blocks_blocked_id_fkey(id, username, full_name, avatar_url)")
    .eq("blocker_id", userId);
  return (data ?? [])
    .map((r: { blocked: ProfileSummary | ProfileSummary[] | null }) =>
      Array.isArray(r.blocked) ? r.blocked[0] : r.blocked,
    )
    .filter((u: ProfileSummary | null | undefined): u is ProfileSummary => Boolean(u));
}
