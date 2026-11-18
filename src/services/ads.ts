import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdPlacement, Advertisement } from "@/types";

export async function listActiveAds(supabase: SupabaseClient, placement: AdPlacement, limit = 3): Promise<Advertisement[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("advertisements")
    .select("*")
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Advertisement[];
}

export async function listAllAds(supabase: SupabaseClient): Promise<Advertisement[]> {
  const { data } = await supabase.from("advertisements").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Advertisement[];
}

export async function getAd(supabase: SupabaseClient, id: string): Promise<Advertisement | null> {
  const { data } = await supabase.from("advertisements").select("*").eq("id", id).maybeSingle();
  return (data as Advertisement) ?? null;
}
