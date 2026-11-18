import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchResult } from "@/types";

interface RawSearchRow {
  kind: SearchResult["kind"];
  item_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string;
}

export async function globalSearch(
  supabase: SupabaseClient,
  q: string,
  limitPerKind = 8,
): Promise<SearchResult[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const { data, error } = await supabase.rpc("global_search", { q: term, lim: limitPerKind });
  if (error) return [];
  return ((data ?? []) as RawSearchRow[]).map((row) => ({
    kind: row.kind,
    id: row.item_id,
    title: row.title,
    subtitle: row.subtitle,
    image_url: row.image_url,
    href: row.href,
  }));
}

export const searchKindLabels: Record<SearchResult["kind"], string> = {
  business: "Estabelecimentos",
  event: "Eventos",
  product: "Mercado",
  post: "Publicações",
  guide: "Guia",
  profile: "Pessoas",
};
