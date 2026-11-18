import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "@/config/site";
import type { Product, ProductCategory, ProductStatus } from "@/types";

export const PRODUCT_SELECT =
  "*, category:product_categories(*), seller:profiles(id, username, full_name, avatar_url)";

export async function listProductCategories(supabase: SupabaseClient): Promise<ProductCategory[]> {
  const { data } = await supabase.from("product_categories").select("*").order("sort_order");
  return (data ?? []) as ProductCategory[];
}

export interface ListProductsParams {
  categorySlug?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "recent" | "price_asc" | "price_desc";
}

export async function listProducts(
  supabase: SupabaseClient,
  params: ListProductsParams = {},
): Promise<{ items: Product[]; hasMore: boolean; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .in("status", ["active", "sold_out"]);

  if (params.categorySlug) {
    const { data: cat } = await supabase
      .from("product_categories")
      .select("id")
      .eq("slug", params.categorySlug)
      .maybeSingle();
    if (!cat) return { items: [], hasMore: false, total: 0 };
    query = query.eq("category_id", cat.id);
  }
  if (params.q) {
    const term = params.q.replace(/[%_,]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  switch (params.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }
  const { data, count } = await query.range(from, from + pageSize);
  const rows = (data ?? []) as Product[];
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize, total: count ?? 0 };
}

export async function listRecentProducts(supabase: SupabaseClient, limit = 8): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Product[];
}

export async function getProduct(supabase: SupabaseClient, id: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  return (data as Product) ?? null;
}

export async function listMyProducts(supabase: SupabaseClient, sellerId: string): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Product[];
}

export async function listProductsForAdmin(
  supabase: SupabaseClient,
  params: { status?: ProductStatus | "all"; page?: number } = {},
): Promise<{ items: Product[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" });
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Product[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}
