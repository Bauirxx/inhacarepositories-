import type { SupabaseClient } from "@supabase/supabase-js";

export interface SiteSettings {
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  contact_email: string;
  contact_whatsapp: string;
  facebook_url: string;
  instagram_url: string;
  emergency_info: string;
  announcement: string;
}

export const defaultSettings: SiteSettings = {
  site_name: "INHACA CONNECT",
  tagline: "A ilha conectada. Uma comunidade, um destino.",
  hero_title: "Descubra a Ilha de Inhaca",
  hero_subtitle:
    "Praias, natureza, negócios locais e uma comunidade ligada. Tudo o que precisa de saber sobre a ilha, num só lugar.",
  hero_image_url: "/images/placeholders/hero-inhaca.svg",
  contact_email: "",
  contact_whatsapp: "",
  facebook_url: "",
  instagram_url: "",
  emergency_info: "",
  announcement: "",
};

export async function getSiteSettings(supabase: SupabaseClient): Promise<SiteSettings> {
  const { data } = await supabase.from("site_settings").select("key, value");
  const result: SiteSettings = { ...defaultSettings };
  (data ?? []).forEach((row: { key: string; value: unknown }) => {
    if (row.key in result && typeof row.value === "string") {
      (result as unknown as Record<string, string>)[row.key] = row.value;
    }
  });
  return result;
}
