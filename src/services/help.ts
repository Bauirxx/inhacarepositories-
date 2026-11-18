import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "@/config/site";
import type { HelpRequest, HelpRequestStatus, HelpRequestType } from "@/types";

export const HELP_SELECT = "*, author:profiles(id, username, full_name, avatar_url)";

export async function listHelpRequests(
  supabase: SupabaseClient,
  params: { status?: HelpRequestStatus | "all"; type?: HelpRequestType | null; page?: number } = {},
): Promise<{ items: HelpRequest[]; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase.from("help_requests").select(HELP_SELECT);
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.type) query = query.eq("type", params.type);
  const { data } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE);
  const rows = (data ?? []) as HelpRequest[];
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getHelpRequest(supabase: SupabaseClient, id: string): Promise<HelpRequest | null> {
  const { data } = await supabase.from("help_requests").select(HELP_SELECT).eq("id", id).maybeSingle();
  return (data as HelpRequest) ?? null;
}

export async function listMyHelpRequests(supabase: SupabaseClient, authorId: string): Promise<HelpRequest[]> {
  const { data } = await supabase
    .from("help_requests")
    .select(HELP_SELECT)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  return (data ?? []) as HelpRequest[];
}
