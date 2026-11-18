import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuidePage } from "@/types";

export async function listGuidePages(supabase: SupabaseClient, includeUnpublished = false): Promise<GuidePage[]> {
  let query = supabase.from("guide_pages").select("*").order("sort_order").order("title");
  if (!includeUnpublished) query = query.eq("is_published", true);
  const { data } = await query;
  return (data ?? []) as GuidePage[];
}

export async function getGuidePage(supabase: SupabaseClient, slug: string): Promise<GuidePage | null> {
  const { data } = await supabase.from("guide_pages").select("*").eq("slug", slug).maybeSingle();
  return (data as GuidePage) ?? null;
}

export async function getGuidePageById(supabase: SupabaseClient, id: string): Promise<GuidePage | null> {
  const { data } = await supabase.from("guide_pages").select("*").eq("id", id).maybeSingle();
  return (data as GuidePage) ?? null;
}
