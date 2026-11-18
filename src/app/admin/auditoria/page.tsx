import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listAuditLogs } from "@/services/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  await requireRole(["admin"], "/admin/auditoria");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, hasMore } = await listAuditLogs(await createClient(), { page, action: q });
  return (
    <div>
      <PageHeader title="Registos de auditoria" description="Todas as ações administrativas e de moderação ficam registadas." />
      <SearchForm action="/admin/auditoria" defaultValue={q} placeholder="Filtrar por ação (ex.: business, user.ban)…" className="mb-4 max-w-md" />
      <p className="mb-2 text-sm text-muted-foreground">{total} registo(s)</p>

      {/* Mobile: cartões; desktop: tabela */}
      <ul className="divide-y rounded-2xl border bg-card md:hidden">
        {items.map((l) => (
          <li key={l.id} className="p-3 text-sm">
            <code className="font-semibold">{l.action}</code>
            <p className="text-xs text-muted-foreground">
              {l.actor?.full_name ?? "sistema"} · {formatDateTime(l.created_at)}
            </p>
            {l.target_type ? (
              <p className="text-xs break-all text-muted-foreground">
                {l.target_type}: {l.target_id}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Utilizador</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(l.created_at)}</TableCell>
                <TableCell>{l.actor?.full_name ?? "sistema"}</TableCell>
                <TableCell>
                  <code>{l.action}</code>
                </TableCell>
                <TableCell className="max-w-48 truncate text-xs">
                  {l.target_type ? `${l.target_type}:${l.target_id}` : "—"}
                </TableCell>
                <TableCell className="max-w-72 truncate text-xs text-muted-foreground">
                  {l.metadata ? JSON.stringify(l.metadata) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} hasMore={hasMore} basePath="/admin/auditoria" searchParams={{ q }} />
    </div>
  );
}
