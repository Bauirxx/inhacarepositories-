import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente privilegiado (secret key / service role).
 * - Ignora RLS: usar APENAS em operações administrativas verificadas no servidor
 *   (ex.: suspender contas via auth.admin).
 * - Nunca importar em código de cliente (o pacote "server-only" garante isso).
 * - Devolve null quando a chave não está configurada, para que a aplicação
 *   continue a funcionar com funcionalidades degradadas.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = env.supabaseSecretKey;
  if (!key) return null;
  return createSupabaseClient(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
