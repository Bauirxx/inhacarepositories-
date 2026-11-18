import { z } from "zod";
import { usernameSchema } from "./auth";

export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^[+\d\s()-]*$/, "Número de telefone inválido.")
  .optional()
  .or(z.literal(""));

export const urlSchema = z
  .string()
  .trim()
  .max(200)
  .refine(
    (v) => v === "" || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v),
    "Endereço inválido.",
  )
  .optional()
  .or(z.literal(""));

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Indique o seu nome.").max(80),
  username: usernameSchema,
  bio: z.string().trim().max(500, "Máximo 500 caracteres.").optional().or(z.literal("")),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  location: z.string().trim().max(80).optional().or(z.literal("")),
  website: urlSchema,
  is_resident: z.boolean().default(false),
  avatar_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;
