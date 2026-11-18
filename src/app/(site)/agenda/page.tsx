import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterChips } from "@/components/shared/filter-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { EventCard } from "@/components/events/event-card";
import { EventCalendar } from "@/components/events/event-calendar";
import { createClient } from "@/lib/supabase/server";
import { listEvents, listEventsForMonth } from "@/services/events";
import { eventCategoryLabels } from "@/config/site";
import { eventCategoryEnum } from "@/lib/validations/event";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Agenda de acontecimentos",
  description: "Festas, eventos culturais, competições desportivas e atividades na Ilha de Inhaca.",
  alternates: { canonical: "/agenda" },
};

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  const view = sp.vista === "calendario" ? "calendario" : "lista";
  const past = sp.passados === "1";
  const cat = eventCategoryEnum.safeParse(sp.categoria);
  const category = cat.success ? cat.data : null;
  const page = Math.max(1, Number(sp.page) || 1);

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    if (m >= 1 && m <= 12 && y > 2000 && y < 2100) {
      year = y;
      month = m;
    }
  }

  const supabase = await createClient();
  const params = { vista: view === "calendario" ? "calendario" : undefined, categoria: category ?? undefined, passados: past ? "1" : undefined };

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader
        eyebrow="Agenda"
        title="Acontecimentos na ilha"
        description="Festas, cultura, desporto, atividades turísticas e iniciativas comunitárias."
        actions={
          <Button asChild>
            <Link href="/dashboard/eventos/novo">
              <Plus /> Submeter evento
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border bg-card p-1">
          <Link
            href={`/agenda${category ? `?categoria=${category}` : ""}`}
            className={cn("flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium", view === "lista" && "bg-ocean text-white")}
          >
            <LayoutGrid className="size-4" /> Lista
          </Link>
          <Link
            href="/agenda?vista=calendario"
            className={cn("flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium", view === "calendario" && "bg-ocean text-white")}
          >
            <CalendarDays className="size-4" /> Calendário
          </Link>
        </div>
        {view === "lista" ? (
          <Link
            href={`/agenda?${new URLSearchParams({ ...(category ? { categoria: category } : {}), ...(past ? {} : { passados: "1" }) })}`}
            className="ml-auto inline-flex min-h-11 items-center text-sm font-medium text-turquoise hover:underline"
          >
            {past ? "Ver próximos eventos" : "Ver eventos passados"}
          </Link>
        ) : null}
      </div>

      {view === "calendario" ? (
        <EventCalendar year={year} month={month} events={await listEventsForMonth(supabase, year, month)} />
      ) : (
        <ListView supabase={supabase} category={category} past={past} page={page} params={params} />
      )}
    </div>
  );
}

async function ListView({
  supabase,
  category,
  past,
  page,
  params,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  category: ReturnType<typeof eventCategoryEnum.parse> | null;
  past: boolean;
  page: number;
  params: Record<string, string | undefined>;
}) {
  const { items, hasMore } = await listEvents(supabase, { category, past, page });
  return (
    <>
      <div className="mb-6">
        <FilterChips
          basePath="/agenda"
          param="categoria"
          active={category}
          searchParams={params}
          options={Object.entries(eventCategoryLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={past ? "Sem eventos passados" : "Sem eventos agendados"}
          description="Os eventos são publicados após aprovação da administração."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
      <Pagination page={page} hasMore={hasMore} basePath="/agenda" searchParams={params} />
    </>
  );
}
