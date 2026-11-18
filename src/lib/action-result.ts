import type { ZodError } from "zod";

/** Resultado serializável devolvido por todas as Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

export function fromZodError<T = undefined>(error: ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = error.issues[0]?.message ?? "Dados inválidos.";
  return { ok: false, error: first, fieldErrors };
}

/** Converte erros do Supabase/PostgREST em mensagens legíveis. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Ocorreu um erro inesperado.";
  switch (error.code) {
    case "23505":
      return "Já existe um registo com estes dados.";
    case "23503":
      return "Referência inválida (registo relacionado não existe).";
    case "42501":
      return "Não tem permissões para esta operação.";
    case "23514":
      return "Os dados não cumprem as regras de validação.";
    case "PGRST116":
      return "Registo não encontrado.";
    default:
      if (error.message?.includes("row-level security")) {
        return "Não tem permissões para esta operação.";
      }
      if (error.message?.toLowerCase().includes("rate limit")) {
        return "Demasiados pedidos. Tente novamente dentro de instantes.";
      }
      return error.message || "Ocorreu um erro inesperado.";
  }
}
