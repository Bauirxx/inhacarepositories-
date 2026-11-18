import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyEvents } from "@/services/events";
import { formatEventDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Os meus eventos", robots: { index: false } };

export default async function MyEventsPage() {
  const user = await requireUser("/dashboard/eventos");
  const events = await listMyEvents(await createClient(), user.id);
  return (
    <div>
      <PageHeader
        title="Os meus eventos"
        description="Os eventos são publicados na agenda depois de aprovados pela administração."
        actions={
          <Button asChild>
            <Link href="/dashboard/eventos/novo">
              <Plus /> Novo evento
            </Link>
          </Button>
        }
      />
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Ainda não submeteu eventos"
          action={
            <Button asChild>
              <Link href="/dashboard/eventos/novo">Submeter evento</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/dashboard/eventos/${e.id}`} className="block truncate font-semibold text-ocean hover:underline">
                  {e.title}
                </Link>
                <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                  {formatEventDate(e.starts_at, e.ends_at)}
                </p>
                {e.status === "rejected" && e.rejection_reason ? (
                  <p className="mt-1 text-xs text-red-700">Motivo: {e.rejection_reason}</p>
                ) : null}
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" /> {e.attendees_count}
              </span>
              <ContentStatusBadge status={e.status} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/agenda/${e.slug}`}>Ver</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
