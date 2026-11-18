import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/descobrir`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/mapa`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/servicos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/agenda`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/mercado`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/comunidade`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/sobre`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const supabase = createPublicClient();
  if (!supabase) return staticRoutes;

  try {
    const [guide, businesses, events, products] = await Promise.all([
      supabase.from("guide_pages").select("slug, updated_at").eq("is_published", true),
      supabase.from("businesses").select("slug, updated_at").eq("status", "approved").limit(5000),
      supabase.from("events").select("slug, updated_at").eq("status", "approved").limit(5000),
      supabase.from("products").select("id, updated_at").eq("status", "active").limit(5000),
    ]);
    return [
      ...staticRoutes,
      ...(guide.data ?? []).map((g) => ({ url: `${base}/descobrir/${g.slug}`, lastModified: new Date(g.updated_at), priority: 0.8 })),
      ...(businesses.data ?? []).map((b) => ({ url: `${base}/servicos/${b.slug}`, lastModified: new Date(b.updated_at), priority: 0.8 })),
      ...(events.data ?? []).map((e) => ({ url: `${base}/agenda/${e.slug}`, lastModified: new Date(e.updated_at), priority: 0.6 })),
      ...(products.data ?? []).map((p) => ({ url: `${base}/mercado/${p.id}`, lastModified: new Date(p.updated_at), priority: 0.4 })),
    ];
  } catch {
    return staticRoutes;
  }
}
