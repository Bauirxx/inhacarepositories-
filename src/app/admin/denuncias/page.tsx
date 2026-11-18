import type { Metadata } from "next";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ReportStatusBadge } from "@/components/shared/status-badge";
import { ReportDecision } from "@/components/admin/report-decision";
import { StatusTabs } from "@/components/admin/status-tabs";
import { createClient } from "@/lib/supabase/server";
import { listReports } from "@/services/admin";
import { reportReasons, reportTargetLabels } from "@/config/site";
import { formatDateTime, truncate } from "@/lib/utils";
import type { Report, ReportStatus, ReportTarget } from "@/types";

export const metadata: Metadata = { title: "Denúncias" };

const tabs = [
  { value: "open", label: "Abertas" },
  { value: "reviewing", label: "Em análise" },
  { value: "resolved", label: "Resolvidas" },
  { value: "dismissed", label: "Arquivadas" },
  { value: "all", label: "Todas" },
];

interface TargetPreview {
  text: string;
  href: string | null;
  author?: string | null;
}

/** Carrega pré-visualizações dos conteúdos denunciados (agrupadas por tipo). */
async function loadPreviews(supabase: SupabaseClient, reports: Report[]): Promise<Map<string, TargetPreview>> {
  const map = new Map<string, TargetPreview>();
  const byType = new Map<ReportTarget, string[]>();
  reports.forEach((r) => byType.set(r.target_type, [...(byType.get(r.target_type) ?? []), r.target_id]));
  const key = (t: string, id: string) => `${t}:${id}`;

  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      switch (type) {
        case "post": {
          const { data } = await supabase.from("posts").select("id, content, author:profiles(full_name)").in("id", ids);
          (data ?? []).forEach((r: { id: string; content: string; author: { full_name: string } | { full_name: string }[] | null }) =>
            map.set(key(type, r.id), {
              text: r.content,
              href: `/feed/${r.id}`,
              author: Array.isArray(r.author) ? r.author[0]?.full_name : r.author?.full_name,
            }),
          );
          break;
        }
        case "comment": {
          const { data } = await supabase.from("comments").select("id, content, post_id, author:profiles(full_name)").in("id", ids);
          (data ?? []).forEach((r: { id: string; content: string; post_id: string; author: { full_name: string } | { full_name: string }[] | null }) =>
            map.set(key(type, r.id), {
              text: r.content,
              href: `/feed/${r.post_id}#comentarios`,
              author: Array.isArray(r.author) ? r.author[0]?.full_name : r.author?.full_name,
            }),
          );
          break;
        }
        case "message": {
          const { data } = await supabase.from("messages").select("id, content, image_url, is_deleted, sender:profiles(full_name)").in("id", ids);
          (data ?? []).forEach(
            (r: { id: string; content: string | null; image_url: string | null; is_deleted: boolean; sender: { full_name: string } | { full_name: string }[] | null }) =>
              map.set(key(type, r.id), {
                text: r.is_deleted ? "(mensagem apagada)" : r.content || (r.image_url ? "(fotografia)" : ""),
                href: null,
                author: Array.isArray(r.sender) ? r.sender[0]?.full_name : r.sender?.full_name,
              }),
          );
          break;
        }
        case "business": {
          const { data } = await supabase.from("businesses").select("id, name, slug").in("id", ids);
          (data ?? []).forEach((r: { id: string; name: string; slug: string }) => map.set(key(type, r.id), { text: r.name, href: `/servicos/${r.slug}` }));
          break;
        }
        case "event": {
          const { data } = await supabase.from("events").select("id, title, slug").in("id", ids);
          (data ?? []).forEach((r: { id: string; title: string; slug: string }) => map.set(key(type, r.id), { text: r.title, href: `/agenda/${r.slug}` }));
          break;
        }
        case "product": {
          const { data } = await supabase.from("products").select("id, title").in("id", ids);
          (data ?? []).forEach((r: { id: string; title: string }) => map.set(key(type, r.id), { text: r.title, href: `/mercado/${r.id}` }));
          break;
        }
        case "help_request": {
          const { data } = await supabase.from("help_requests").select("id, title").in("id", ids);
          (data ?? []).forEach((r: { id: string; title: string }) => map.set(key(type, r.id), { text: r.title, href: `/comunidade/ajuda/${r.id}` }));
          break;
        }
        case "profile": {
          const { data } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
          (data ?? []).forEach((r: { id: string; full_name: string; username: string }) =>
            map.set(key(type, r.id), { text: `${r.full_name} (@${r.username})`, href: `/admin/utilizadores/${r.id}` }),
          );
          break;
        }
      }
    }),
  );
  return map;
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/denuncias">) {
  const sp = await searchParams;
  const estado = (tabs.some((t) => t.value === sp.estado) ? sp.estado : "open") as ReportStatus | "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { items, total, hasMore } = await listReports(supabase, { status: estado, page });
  const previews = await loadPreviews(supabase, items);
  const reasonLabel = (r: string) => reportReasons.find((x) => x.value === r)?.label ?? r;

  return (
    <div>
      <PageHeader title="Denúncias" description="Analisar conteúdos denunciados pela comunidade e tomar medidas." />
      <StatusTabs basePath="/admin/denuncias" active={estado} options={tabs} />
      <p className="mb-2 text-sm text-muted-foreground">{total} denúncia(s)</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem denúncias.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {items.map((r) => {
            const preview = previews.get(`${r.target_type}:${r.target_id}`);
            return (
              <li key={r.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{reportTargetLabels[r.target_type]}</Badge>
                    <ReportStatusBadge status={r.status} />
                    <span className="text-sm font-semibold">{reasonLabel(r.reason)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Denunciado por {r.reporter?.full_name ?? "—"} · {formatDateTime(r.created_at)}
                  </p>
                  <div className="mt-2 rounded-xl bg-muted/60 p-3 text-sm">
                    {preview ? (
                      <>
                        {preview.author ? <span className="font-semibold">{preview.author}: </span> : null}
                        {truncate(preview.text || "(sem texto)", 300)}
                        {preview.href ? (
                          <Link href={preview.href} className="ml-2 font-medium text-turquoise underline" target="_blank">
                            abrir
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Conteúdo já não existe.</span>
                    )}
                  </div>
                  {r.details ? <p className="mt-2 text-sm">“{r.details}”</p> : null}
                  {r.resolution_notes ? <p className="mt-1 text-xs text-muted-foreground">Decisão: {r.resolution_notes}</p> : null}
                </div>
                <ReportDecision id={r.id} status={r.status} targetType={r.target_type} />
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} hasMore={hasMore} basePath="/admin/denuncias" searchParams={{ estado }} />
    </div>
  );
}
