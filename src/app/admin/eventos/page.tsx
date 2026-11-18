import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { ModerationButtons } from "@/components/admin/moderation-buttons";
import { ActionButton } from "@/components/admin/toggle-action";
import { StatusTabs } from "@/components/admin/status-tabs";
import { createClient } from "@/lib/supabase/server";
import { listEventsForAdmin } from "@/services/events";
import { setEventFeatured } from "@/features/admin/actions";
import { eventCategoryLabels } from "@/config/site";
import { formatDateTime } from "@/lib/utils";
import type { ContentStatus } from "@/types";

export const metadata: Metadata = { title: "Eventos" };

const tabs = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "suspended", label: "Suspensos" },
  { value: "all", label: "Todos" },
];

export default async function AdminEventsPage({ searchParams }: PageProps<"/admin/eventos">) {
  const sp = await searchParams;
  const estado = (tabs.some((t) => t.value === sp.estado) ? sp.estado : "pending") as ContentStatus | "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, hasMore } = await listEventsForAdmin(await createClient(), { status: estado, page });
  return (
    <div>
      <PageHeader title="Eventos" description="Aprovar eventos submetidos pelos organizadores e gerir destaques da agenda." />
      <StatusTabs basePath="/admin/eventos" active={estado} options={tabs} />
      <p className="mb-2 text-sm text-muted-foreground">{total} evento(s)</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem eventos.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {items.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/agenda/${e.slug}`} className="font-semibold hover:text-turquoise">
                    {e.title}
                  </Link>
                  <ContentStatusBadge status={e.status} />
                  {e.is_featured ? <Star className="size-4 fill-sand text-sand" aria-label="Destaque" /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {eventCategoryLabels[e.category]} · {formatDateTime(e.starts_at)} · {e.location_name ?? "local não indicado"} ·{" "}
                  {e.organizer?.full_name}
                </p>
                {e.rejection_reason ? <p className="mt-1 text-xs text-red-700">Motivo: {e.rejection_reason}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ModerationButtons kind="event" id={e.id} status={e.status} />
                {e.status === "approved" ? (
                  <ActionButton action={setEventFeatured.bind(null, { id: e.id, value: !e.is_featured })}>
                    {e.is_featured ? "Remover destaque" : "Destacar"}
                  </ActionButton>
                ) : null}
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/dashboard/eventos/${e.id}`}>Editar</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} hasMore={hasMore} basePath="/admin/eventos" searchParams={{ estado }} />
    </div>
  );
}
