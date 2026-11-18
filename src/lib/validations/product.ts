import { z } from "zod";
import { phoneSchema } from "./profile";

export const productSchema = z.object({
  title: z.string().trim().min(2, "Indique o nome do produto.").max(120),
  description: z.string().trim().max(3000, "Máximo 3000 caracteres.").optional().or(z.literal("")),
  category_id: z.string().uuid("Escolha uma categoria."),
  price: z
    .number({ message: "Indique um preço válido." })
    .min(0, "O preço não pode ser negativo.")
    .max(100_000_000)
    .nullable()
    .optional(),
  unit: z.string().trim().max(30).optional().or(z.literal("")),
  is_negotiable: z.boolean().default(false),
  images: z.array(z.string().url().max(500)).max(8, "Máximo 8 fotografias.").default([]),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  contact_phone: phoneSchema,
  contact_whatsapp: phoneSchema,
  status: z.enum(["active", "sold_out", "archived"]).default("active"),
});
export type ProductInput = z.infer<typeof productSchema>;
