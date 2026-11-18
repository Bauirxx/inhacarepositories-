import { z } from "zod";

export const postCategoryEnum = z.enum([
  "noticia",
  "aviso",
  "evento",
  "emprego",
  "turismo",
  "comercio",
  "transporte",
  "comunidade",
  "outro",
]);

export const postMediaSchema = z.object({
  url: z.string().url().max(500),
  type: z.enum(["image", "video"]),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export const postSchema = z
  .object({
    content: z.string().trim().max(5000, "Máximo 5000 caracteres."),
    category: postCategoryEnum.default("comunidade"),
    location: z.string().trim().max(120).optional().or(z.literal("")),
    media: z.array(postMediaSchema).max(6, "Máximo 6 ficheiros.").default([]),
    business_id: z.string().uuid().nullable().optional(),
    event_id: z.string().uuid().nullable().optional(),
  })
  .refine((d) => d.content.length > 0 || d.media.length > 0, {
    message: "Escreva algo ou adicione uma fotografia.",
    path: ["content"],
  });
export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  content: z.string().trim().min(1, "Escreva um comentário.").max(2000, "Máximo 2000 caracteres."),
});
export type CommentInput = z.infer<typeof commentSchema>;
