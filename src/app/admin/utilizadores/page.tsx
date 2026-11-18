import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StatusTabs } from "@/components/admin/status-tabs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUsersForAdmin } from "@/services/admin";
import { roleLabels } from "@/config/site";
import { formatDate } from "@/lib/utils";
import type { AppRole } from "@/types";

export const metadata: Metadata = { title: "Utilizadores" };

const tabs = [
  { value: "all", label: "Todos" },
  { value: "resident", label: "Habitantes" },
  { value: "business_owner", label: "Prestadores" },
  { value: "seller", label: "Vendedores" },
  { value: "event_organizer", label: "Organizadores" },
  { value: "moderator", label: "Moderadores" },
  { value: "admin", label: "Administradores" },
  { value: "banned", label: "Suspensos" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilizadores">) {
  await requireRole(["admin"], "/admin/utilizadores");
  const sp = await searchParams;
  const papel = tabs.some((t) => t.value === sp.papel) ? (sp.papel as string) : "all";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, hasMore } = await listUsersForAdmin(await createClient(), {
    q,
    page,
    role: papel === "banned" ? "all" : (papel as AppRole | "all"),
    banned: papel === "banned",
  });
  return (
    <div>
      <PageHeader title="Utilizadores" description="Gerir contas, papéis e permissões (RBAC)." />
      <StatusTabs basePath="/admin/utilizadores" active={papel} options={tabs} param="papel" />
      <SearchForm action="/admin/utilizadores" defaultValue={q} hidden={{ papel }} placeholder="Nome ou utilizador…" className="mb-4 max-w-md" />
      <p className="mb-2 text-sm text-muted-foreground">{total} utilizador(es)</p>
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map((u) => (
          <li key={u.id}>
            <Link href={`/admin/utilizadores/${u.id}`} className="flex flex-col gap-2 p-3 hover:bg-muted sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar name={u.full_name} src={u.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {u.full_name} {u.is_banned ? <Badge variant="destructive">Suspenso</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{u.username} · desde {formatDate(u.created_at, "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.roles
                  .filter((r) => r !== "visitor")
                  .map((r) => (
                    <Badge key={r} variant={r === "admin" || r === "moderator" ? "default" : "secondary"}>
                      {roleLabels[r]}
                    </Badge>
                  ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} hasMore={hasMore} basePath="/admin/utilizadores" searchParams={{ papel, q }} />
    </div>
  );
}
