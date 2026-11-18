import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { Pagination } from "@/components/shared/pagination";
import { ActionButton } from "@/components/admin/toggle-action";
import { HidePostButton } from "@/components/admin/hide-post-button";
import { StatusTabs } from "@/components/admin/status-tabs";
import { createClient } from "@/lib/supabase/server";
import { listPostsForAdmin } from "@/services/posts";
import { setPostHidden, setPostPinned } from "@/features/admin/actions";
import { deletePost } from "@/features/posts/actions";
import { postCategoryLabels } from "@/config/site";
import { formatDateTime, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicações" };

const tabs = [
  { value: "visible", label: "Visíveis" },
  { value: "hidden", label: "Ocultas" },
  { value: "all", label: "Todas" },
];

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/publicacoes">) {
  const sp = await searchParams;
  const estado = (tabs.some((t) => t.value === sp.estado) ? sp.estado : "visible") as "visible" | "hidden" | "all";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, hasMore } = await listPostsForAdmin(await createClient(), { hidden: estado, q, page });
  return (
    <div>
      <PageHeader title="Publicações" description="Moderar o feed: fixar avisos importantes, ocultar ou eliminar conteúdos." />
      <StatusTabs basePath="/admin/publicacoes" active={estado} options={tabs} />
      <SearchForm action="/admin/publicacoes" defaultValue={q} hidden={{ estado }} placeholder="Pesquisar no conteúdo…" className="mb-4 max-w-md" />
      <p className="mb-2 text-sm text-muted-foreground">{total} publicação(ões)</p>
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{p.author?.full_name}</span>
                <Badge variant="secondary">{postCategoryLabels[p.category]}</Badge>
                {p.is_pinned ? <Pin className="size-3.5 text-coral" aria-label="Fixada" /> : null}
                {p.is_hidden ? <Badge variant="destructive">Oculta</Badge> : null}
                <span>{formatDateTime(p.created_at)}</span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-line">{truncate(p.content || "(apenas media)", 280)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.likes_count} gostos · {p.comments_count} comentários · {p.media?.length ?? 0} media
                {p.hidden_reason ? ` · motivo: ${p.hidden_reason}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/feed/${p.id}`}>
                  <Eye /> Ver
                </Link>
              </Button>
              <ActionButton action={setPostPinned.bind(null, { id: p.id, value: !p.is_pinned })}>
                {p.is_pinned ? "Desafixar" : "Fixar"}
              </ActionButton>
              {p.is_hidden ? (
                <ActionButton action={setPostHidden.bind(null, { id: p.id, hidden: false })}>Repor</ActionButton>
              ) : (
                <HidePostButton id={p.id} />
              )}
              <ActionButton action={deletePost.bind(null, p.id)} variant="destructive" confirmText="Eliminar definitivamente?" successText="Eliminada.">
                Eliminar
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} hasMore={hasMore} basePath="/admin/publicacoes" searchParams={{ estado, q }} />
    </div>
  );
}
