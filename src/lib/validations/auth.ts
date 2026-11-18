import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Indique o seu email.")
  .email("Email inválido.")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres.")
  .max(72, "A palavra-passe é demasiado longa.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Use letras e números na palavra-passe.",
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres.")
  .max(30, "Máximo 30 caracteres.")
  .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _.");

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Indique o seu nome.").max(80),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string(),
    is_resident: z.boolean().default(false),
    accept_terms: z.boolean().refine((v) => v === true, {
      message: "Tem de aceitar os termos de utilização.",
    }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "As palavras-passe não coincidem.",
    path: ["confirm_password"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Indique a palavra-passe."),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "As palavras-passe não coincidem.",
    path: ["confirm_password"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
