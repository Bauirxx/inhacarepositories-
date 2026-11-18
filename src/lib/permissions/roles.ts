import type { AppRole } from "@/types";

/**
 * Regras de autorização partilhadas entre cliente e servidor.
 * NOTA: estas verificações no cliente servem apenas para a interface.
 * A autorização efetiva é garantida no servidor (Server Actions) e na base
 * de dados (políticas RLS + funções has_role / is_admin / is_moderator).
 */

export const STAFF_ROLES: AppRole[] = ["moderator", "admin"];

export function hasRole(roles: AppRole[] | undefined | null, role: AppRole): boolean {
  return Boolean(roles?.includes(role));
}

export function hasAnyRole(roles: AppRole[] | undefined | null, wanted: AppRole[]): boolean {
  if (!roles) return false;
  return wanted.some((r) => roles.includes(r));
}

export function isAdmin(roles: AppRole[] | undefined | null): boolean {
  return hasRole(roles, "admin");
}

export function isModerator(roles: AppRole[] | undefined | null): boolean {
  return hasAnyRole(roles, STAFF_ROLES);
}

export function canModerate(roles: AppRole[] | undefined | null): boolean {
  return isModerator(roles);
}

export function canAccessAdmin(roles: AppRole[] | undefined | null): boolean {
  return isModerator(roles);
}

/** Papéis que o administrador pode atribuir/remover manualmente. */
export const ASSIGNABLE_ROLES: AppRole[] = [
  "resident",
  "business_owner",
  "seller",
  "event_organizer",
  "moderator",
  "admin",
];
