import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, CurrentUser, Profile } from "@/types";
import { canAccessAdmin, hasAnyRole } from "@/lib/permissions/roles";

/**
 * Obtém o utilizador autenticado, o seu perfil e papéis.
 * Memoizado por pedido (React cache) para evitar consultas repetidas.
 * Devolve null quando não há sessão.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  if (!profile) {
    // O trigger de criação de perfil ainda não correu (caso raro) — tratamos
    // como sessão inválida para a UI, mantendo a sessão de auth.
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    roles: (roles ?? []).map((r: { role: AppRole }) => r.role),
  };
});

/** Exige sessão; redireciona para /entrar quando não existe. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  if (user.profile.is_banned) {
    redirect("/conta-suspensa");
  }
  return user;
}

/** Exige um dos papéis indicados; redireciona para a página inicial caso contrário. */
export async function requireRole(roles: AppRole[], nextPath?: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (!hasAnyRole(user.roles, roles)) {
    redirect("/");
  }
  return user;
}

export async function requireStaff(nextPath?: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (!canAccessAdmin(user.roles)) redirect("/");
  return user;
}

export type ActionContext = {
  supabase: SupabaseClient;
  user: CurrentUser;
};

/**
 * Para Server Actions: devolve contexto autenticado ou uma mensagem de erro.
 * Não redireciona (as actions devolvem resultados serializáveis).
 */
export async function getActionContext(): Promise<
  { ok: true; ctx: ActionContext } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Precisa de iniciar sessão para continuar." };
  if (user.profile.is_banned)
    return { ok: false, error: "A sua conta está suspensa. Contacte a administração." };
  const supabase = await createClient();
  return { ok: true, ctx: { supabase, user } };
}

export async function getStaffActionContext(): Promise<
  { ok: true; ctx: ActionContext } | { ok: false; error: string }
> {
  const result = await getActionContext();
  if (!result.ok) return result;
  if (!canAccessAdmin(result.ctx.user.roles)) {
    return { ok: false, error: "Não tem permissões para esta operação." };
  }
  return result;
}
