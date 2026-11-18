import { z } from "zod";
import { phoneSchema } from "./profile";

export const eventCategoryEnum = z.enum([
  "festa",
  "cultura",
  "desporto",
  "turismo",
  "comunidade",
  "religioso",
  "mercado",
  "outro",
]);

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Indique o título do evento.").max(140),
    description: z.string().trim().max(5000, "Máximo 5000 caracteres.").optional().or(z.literal("")),
    category: eventCategoryEnum.default("comunidade"),
    cover_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
    starts_at: z.string().min(1, "Indique a data e hora de início."),
    ends_at: z.string().optional().or(z.literal("")),
    location_name: z.string().trim().max(200).optional().or(z.literal("")),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    business_id: z.string().uuid().nullable().optional(),
    contact_phone: phoneSchema,
    contact_whatsapp: phoneSchema,
    price_info: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      const start = new Date(d.starts_at);
      return !Number.isNaN(start.getTime());
    },
    { message: "Data de início inválida.", path: ["starts_at"] },
  )
  .refine(
    (d) => {
      if (!d.ends_at) return true;
      const start = new Date(d.starts_at);
      const end = new Date(d.ends_at);
      return !Number.isNaN(end.getTime()) && end >= start;
    },
    { message: "O fim deve ser depois do início.", path: ["ends_at"] },
  );
export type EventInput = z.infer<typeof eventSchema>;

export const attendSchema = z.object({
  event_id: z.string().uuid(),
  status: z.enum(["going", "interested"]).nullable(),
});
