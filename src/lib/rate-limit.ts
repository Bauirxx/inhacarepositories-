import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limitação de pedidos persistida na base de dados (função SQL
 * public.check_rate_limit), adequada a ambientes serverless como a Vercel,
 * onde um contador em memória não é partilhado entre instâncias.
 *
 * @returns true se o pedido está dentro do limite.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _key: key,
    _max: max,
    _window_seconds: windowSeconds,
  });
  if (error) {
    // Em caso de falha da função não bloqueamos o utilizador, mas registamos.
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data !== false;
}

export const RATE_LIMITS = {
  post: { max: 10, window: 600 },
  comment: { max: 30, window: 600 },
  message: { max: 60, window: 60 },
  report: { max: 10, window: 3600 },
  review: { max: 5, window: 3600 },
  business: { max: 5, window: 3600 },
  product: { max: 20, window: 3600 },
  event: { max: 10, window: 3600 },
  help: { max: 10, window: 3600 },
  profile: { max: 20, window: 600 },
} as const;
