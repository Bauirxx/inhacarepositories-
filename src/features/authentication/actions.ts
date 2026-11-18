"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdatePasswordInput,
} from "@/lib/validations/auth";
import { isUsernameAvailable } from "@/services/profiles";
import { safeInternalPath } from "@/lib/utils";

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (process.env.NEXT_PUBLIC_SITE_URL) return env.siteUrl;
  return host ? `${proto}://${host}` : env.siteUrl;
}

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (m.includes("email not confirmed")) return "Confirme o seu email antes de iniciar sessão.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este email.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiadas tentativas. Aguarde um pouco.";
  if (m.includes("weak") || m.includes("password")) return "A palavra-passe não cumpre os requisitos.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export async function signUp(input: RegisterInput): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const supabase = await createClient();
  if (!(await isUsernameAvailable(supabase, data.username))) {
    return fail("Este nome de utilizador já está a ser usado.", { username: ["Indisponível."] });
  }

  const origin = await originUrl();
  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        full_name: data.full_name,
        username: data.username,
        is_resident: data.is_resident,
      },
    },
  });
  if (error) return fail(authErrorMessage(error.message));
  return ok({ needsConfirmation: !result.session });
}

export async function signIn(input: LoginInput): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return fail(authErrorMessage(error.message));
  return ok({ redirectTo: safeInternalPath(parsed.data.next, "/dashboard") });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const origin = await originUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-palavra-passe`,
  });
  // Por segurança respondemos sempre com sucesso (não revela se o email existe),
  // exceto em casos de rate limiting.
  if (error && error.message.toLowerCase().includes("rate")) return fail(authErrorMessage(error.message));
  return ok(undefined);
}

export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("A ligação expirou. Peça uma nova recuperação de palavra-passe.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorMessage(error.message));
  return ok(undefined);
}

export async function resendConfirmation(email: string): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const origin = await originUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error) return fail(authErrorMessage(error.message));
  return ok(undefined);
}
