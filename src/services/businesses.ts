import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "@/config/site";
import type {
  Business,
  BusinessCategory,
  BusinessVerification,
  ContentStatus,
  Review,
} from "@/types";

export const BUSINESS_SELECT =
  "*, category:business_categories(*), owner:profiles!businesses_owner_id_fkey(id, username, full_name, avatar_url)";

export const BUSINESS_DETAIL_SELECT =
  `${BUSINESS_SELECT}, media:business_media(*), services:business_services(*)`;

export type MapBusiness = Pick<
  Business,
  | "id"
  | "name"
  | "slug"
  | "category_id"
  | "latitude"
  | "longitude"
  | "logo_url"
  | "cover_url"
  | "short_description"
  | "phone"
  | "whatsapp"
  | "is_verified"
  | "rating_avg"
  | "rating_count"
  | "address"
> & { category: Pick<BusinessCategory, "slug" | "name" | "icon"> | null };

export async function listBusinessCategories(supabase: SupabaseClient): Promise<BusinessCategory[]> {
  const { data } = await supabase
    .from("business_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as BusinessCategory[];
}

export interface ListBusinessesParams {
  categorySlug?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "featured" | "rating" | "recent" | "name";
}

export async function listBusinesses(
  supabase: SupabaseClient,
  params: ListBusinessesParams = {},
): Promise<{ items: Business[]; hasMore: boolean; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("businesses")
    .select(BUSINESS_SELECT, { count: "exact" })
    .eq("status", "approved");

  if (params.categorySlug) {
    const { data: cat } = await supabase
      .from("business_categories")
      .select("id")
      .eq("slug", params.categorySlug)
      .maybeSingle();
    if (!cat) return { items: [], hasMore: false, total: 0 };
    query = query.eq("category_id", cat.id);
  }
  if (params.q) {
    const term = params.q.replace(/[%_,]/g, " ").trim();
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,short_description.ilike.%${term}%,address.ilike.%${term}%`,
      );
    }
  }

  switch (params.sort) {
    case "rating":
      query = query.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
      break;
    case "recent":
      query = query.order("approved_at", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("is_verified", { ascending: false })
        .order("rating_avg", { ascending: false })
        .order("name", { ascending: true });
  }

  const { data, count } = await query.range(from, from + pageSize);
  const rows = (data ?? []) as Business[];
  return {
    items: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
    total: count ?? rows.length,
  };
}

export async function listFeaturedBusinesses(supabase: SupabaseClient, limit = 6): Promise<Business[]> {
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("status", "approved")
    .order("is_featured", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("rating_avg", { ascending: false })
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as Business[];
}

export async function getBusinessBySlug(supabase: SupabaseClient, slug: string): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const business = data as Business;
  business.media = [...(business.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  business.services = [...(business.services ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return business;
}

export async function getBusinessById(supabase: SupabaseClient, id: string): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const business = data as Business;
  business.media = [...(business.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  business.services = [...(business.services ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return business;
}

export async function listMapBusinesses(supabase: SupabaseClient): Promise<MapBusiness[]> {
  const { data } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, category_id, latitude, longitude, logo_url, cover_url, short_description, phone, whatsapp, is_verified, rating_avg, rating_count, address, category:business_categories(slug, name, icon)",
    )
    .eq("status", "approved")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(1000);
  return (data ?? []) as unknown as MapBusiness[];
}

export async function listMyBusinesses(supabase: SupabaseClient, ownerId: string): Promise<Business[]> {
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Business[];
}

export async function listReviews(supabase: SupabaseClient, businessId: string, limit = 20): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*, author:profiles(id, username, full_name, avatar_url)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getMyReview(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<Review | null> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("business_id", businessId)
    .eq("author_id", userId)
    .maybeSingle();
  return (data as Review) ?? null;
}

/* ---------------- Administração ---------------- */

export async function listBusinessesForAdmin(
  supabase: SupabaseClient,
  params: { status?: ContentStatus | "all"; q?: string; page?: number } = {},
): Promise<{ items: Business[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let query = supabase.from("businesses").select(BUSINESS_SELECT, { count: "exact" });
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.q) query = query.ilike("name", `%${params.q.replace(/[%_,]/g, " ")}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Business[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}

export async function listVerifications(
  supabase: SupabaseClient,
  status: ContentStatus | "all" = "pending",
): Promise<BusinessVerification[]> {
  let query = supabase
    .from("business_verifications")
    .select("*, business:businesses(id, name, slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []) as BusinessVerification[];
}

export async function listVerificationsForBusiness(
  supabase: SupabaseClient,
  businessId: string,
): Promise<BusinessVerification[]> {
  const { data } = await supabase
    .from("business_verifications")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BusinessVerification[];
}
