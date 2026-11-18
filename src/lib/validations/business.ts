import { z } from "zod";
import { phoneSchema, urlSchema } from "./profile";

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida.").default("08:00"),
  close: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida.").default("18:00"),
  closed: z.boolean().default(false),
});

export const openingHoursSchema = z
  .object({
    mon: dayHoursSchema.optional(),
    tue: dayHoursSchema.optional(),
    wed: dayHoursSchema.optional(),
    thu: dayHoursSchema.optional(),
    fri: dayHoursSchema.optional(),
    sat: dayHoursSchema.optional(),
    sun: dayHoursSchema.optional(),
  })
  .default({});

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const businessServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Indique o nome do serviço.").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.string().trim().max(60).optional().or(z.literal("")),
});

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do estabelecimento.").max(120),
  category_id: z.string().uuid("Escolha uma categoria."),
  short_description: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres.")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(5000, "Máximo 5000 caracteres.").optional().or(z.literal("")),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z.string().trim().email("Email inválido.").max(254).optional().or(z.literal("")),
  website: urlSchema,
  address: z.string().trim().max(200).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  opening_hours: openingHoursSchema,
  price_info: z.string().trim().max(120).optional().or(z.literal("")),
  amenities: z.array(z.string().max(40)).max(30).default([]),
  logo_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
  cover_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
  gallery: z.array(z.string().url().max(500)).max(12).default([]),
  services: z.array(businessServiceSchema).max(30).default([]),
});
export type BusinessInput = z.infer<typeof businessSchema>;

export const reviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.number().int().min(1, "Escolha uma classificação.").max(5),
  comment: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal("")),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const verificationRequestSchema = z.object({
  business_id: z.string().uuid(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  document_url: z.string().max(500).optional().or(z.literal("")),
});
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;
