import { z } from "zod";
import { phoneSchema } from "./profile";

export const messageSchema = z
  .object({
    conversation_id: z.string().uuid(),
    content: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional().or(z.literal("")),
    image_url: z.string().max(500).optional().nullable(),
  })
  .refine((d) => (d.content && d.content.length > 0) || Boolean(d.image_url), {
    message: "Escreva uma mensagem ou envie uma fotografia.",
    path: ["content"],
  });
export type MessageInput = z.infer<typeof messageSchema>;

export const helpRequestSchema = z.object({
  type: z.enum(["transporte", "produto", "servico", "assistencia", "emprego", "outro"]),
  title: z.string().trim().min(3, "Indique um título.").max(120),
  description: z.string().trim().min(10, "Descreva o pedido (mínimo 10 caracteres).").max(2000),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  contact_phone: phoneSchema,
  contact_whatsapp: phoneSchema,
});
export type HelpRequestInput = z.infer<typeof helpRequestSchema>;

export const reportSchema = z.object({
  target_type: z.enum([
    "post",
    "comment",
    "message",
    "business",
    "product",
    "event",
    "profile",
    "help_request",
  ]),
  target_id: z.string().uuid(),
  reason: z.enum(["spam", "offensive", "false_info", "scam", "inappropriate", "other"]),
  details: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional().or(z.literal("")),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const blockUserSchema = z.object({
  user_id: z.string().uuid(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(3, "Indique o nome do grupo.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífenes."),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  topic: z.string().trim().max(40).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  is_default: z.boolean().default(false),
});
export type GroupInput = z.infer<typeof groupSchema>;
