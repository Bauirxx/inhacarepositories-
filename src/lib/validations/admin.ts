import { z } from "zod";

export const appRoleEnum = z.enum([
  "visitor",
  "resident",
  "business_owner",
  "seller",
  "event_organizer",
  "moderator",
  "admin",
]);

export const moderationDecisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject", "suspend", "restore"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

export const toggleFlagSchema = z.object({
  id: z.string().uuid(),
  value: z.boolean(),
});

export const userRoleChangeSchema = z.object({
  user_id: z.string().uuid(),
  role: appRoleEnum,
  action: z.enum(["grant", "revoke"]),
});

export const banUserSchema = z.object({
  user_id: z.string().uuid(),
  banned: z.boolean(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const reportDecisionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
  resolution_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  hide_target: z.boolean().default(false),
});

export const hideContentSchema = z.object({
  id: z.string().uuid(),
  hidden: z.boolean(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const advertisementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  advertiser_name: z.string().trim().max(120).optional().or(z.literal("")),
  image_url: z.string().url().max(500).optional().or(z.literal("")),
  link_url: z.string().url().max(500).optional().or(z.literal("")),
  placement: z.enum(["home", "feed", "directory", "sidebar"]),
  starts_at: z.string().optional().or(z.literal("")),
  ends_at: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});
export type AdvertisementInput = z.infer<typeof advertisementSchema>;

export const guidePageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífenes."),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Escreva o conteúdo.").max(50_000),
  cover_url: z.string().url().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_published: z.boolean().default(true),
});
export type GuidePageInput = z.infer<typeof guidePageSchema>;

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  hero_title: z.string().trim().max(120).optional().or(z.literal("")),
  hero_subtitle: z.string().trim().max(300).optional().or(z.literal("")),
  hero_image_url: z.string().max(500).optional().or(z.literal("")),
  contact_email: z.string().trim().email().max(254).optional().or(z.literal("")),
  contact_whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  facebook_url: z.string().trim().max(300).optional().or(z.literal("")),
  instagram_url: z.string().trim().max(300).optional().or(z.literal("")),
  emergency_info: z.string().trim().max(2000).optional().or(z.literal("")),
  announcement: z.string().trim().max(300).optional().or(z.literal("")),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
