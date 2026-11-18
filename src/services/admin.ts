import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminStats, AppRole, AuditLog, Profile, Report, ReportStatus, UserRole } from "@/types";

export async function getAdminStats(supabase: SupabaseClient): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error || !data) return null;
  return data as AdminStats;
}

export interface AdminUser extends Profile {
  roles: AppRole[];
}

export async function listUsersForAdmin(
  supabase: SupabaseClient,
  params: { q?: string; role?: AppRole | "all"; banned?: boolean; page?: number } = {},
): Promise<{ items: AdminUser[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  let query = supabase.from("profiles").select("*", { count: "exact" });
  if (params.q) {
    const term = params.q.replace(/[%_,]/g, " ").trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`);
  }
  if (params.banned) query = query.eq("is_banned", true);
  if (params.role && params.role !== "all") {
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", params.role).limit(2000);
    const ids = (roleRows ?? []).map((r: { user_id: string }) => r.user_id);
    if (ids.length === 0) return { items: [], total: 0, hasMore: false };
    query = query.in("id", ids);
  }
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Profile[];
  const pageRows = rows.slice(0, pageSize);
  const ids = pageRows.map((p) => p.id);
  const { data: roles } = ids.length
    ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] as { user_id: string; role: AppRole }[] };
  const rolesByUser = new Map<string, AppRole[]>();
  (roles ?? []).forEach((r: { user_id: string; role: AppRole }) => {
    rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
  });
  return {
    items: pageRows.map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] })),
    total: count ?? 0,
    hasMore: rows.length > pageSize,
  };
}

export async function getUserForAdmin(supabase: SupabaseClient, userId: string): Promise<AdminUser | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("*").eq("user_id", userId),
  ]);
  if (!profile) return null;
  return { ...(profile as Profile), roles: ((roles ?? []) as UserRole[]).map((r) => r.role) };
}

export async function listReports(
  supabase: SupabaseClient,
  params: { status?: ReportStatus | "all"; page?: number } = {},
): Promise<{ items: Report[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(id, username, full_name, avatar_url)", {
      count: "exact",
    });
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Report[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  params: { page?: number; action?: string } = {},
): Promise<{ items: AuditLog[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, username, full_name, avatar_url)", { count: "exact" });
  if (params.action) query = query.ilike("action", `%${params.action.replace(/[%_,]/g, "")}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as AuditLog[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}

/** Regista uma ação administrativa (chamado a partir de Server Actions). */
export async function writeAuditLog(
  supabase: SupabaseClient,
  actorId: string,
  action: string,
  target?: { type: string; id: string },
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    metadata: metadata ?? null,
  });
}
