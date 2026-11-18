import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarPlus, MapPin, Pencil, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/shared/cover-image";
import { ContactButtons } from "@/components/shared/contact-buttons";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReportDialog } from "@/components/shared/report-dialog";
import { AttendanceButtons } from "@/components/events/attendance-buttons";
import { StaticLocationMap } from "@/components/map/static-location-map";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getEventBySlug } from "@/services/events";
import { eventCategoryLabels } from "@/config/site";
import { env } from "@/lib/env";
import { formatEventDate, truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/agenda/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventBySlug(await createClient(), slug);
  if (!e) return { title: "Evento não encontrado" };
  const description = truncate(e.description ?? `${e.title} na Ilha de Inhaca`, 160);
  return {
    title: e.title,
    description,
    alternates: { canonical: `/agenda/${e.slug}` },
    robots: e.status === "approved" ? undefined : { index: false },
    openGraph: { type: "article", title: e.title, description, images: e.cover_url ? [e.cover_url] : undefined },
  };
}

function googleCalendarUrl(title: string, start: string, end: string | null, location: string | null, details: string) {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endDate = end ?? new Date(new Date(start).getTime() + 2 * 3600_000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(endDate)}`,
    details,
    location: location ?? "Ilha de Inhaca",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default async function EventPage({ params }: PageProps<"/agenda/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const event = await getEventBySlug(supabase, slug, user?.id ?? null);
  if (!event) notFound();
  const isOrganizer = user?.id === event.organizer_id;
  const canManage = isOrganizer || (user && isModerator(user.roles));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    description: event.description ?? undefined,
    image: event.cover_url ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.location_name ?? "Ilha de Inhaca", address: { "@type": "PostalAddress", addressCountry: "MZ" } },
    organizer: { "@type": "Person", name: event.organizer?.full_name },
    url: `${env.siteUrl}/agenda/${event.slug}`,
  };

  return (
    <div className="pb-8">
      {event.status === "approved" ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
      <div className="relative">
        <CoverImage src={event.cover_url} alt={event.title} className="h-52 sm:h-80" priority sizes="100vw" icon={CalendarDays} />
        <div className="container-page absolute inset-x-0 top-3">
          <Button asChild variant="secondary" size="sm" className="bg-white/90 shadow">
            <Link href="/agenda">
              <ArrowLeft /> Agenda
            </Link>
          </Button>
        </div>
      </div>
      <div className="container-page mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-turquoise-light px-3 py-1 text-xs font-semibold text-ocean">
                {eventCategoryLabels[event.category]}
              </span>
              {event.status !== "approved" ? <ContentStatusBadge status={event.status} /> : null}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-ocean sm:text-4xl">{event.title}</h1>
            {event.status === "rejected" && event.rejection_reason && isOrganizer ? (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Motivo da rejeição: {event.rejection_reason}</p>
            ) : null}
          </div>
          {event.description ? (
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-ocean">Sobre o evento</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line">{event.description}</p>
            </section>
          ) : null}
          {event.latitude != null && event.longitude != null ? (
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-ocean">Localização</h2>
              <StaticLocationMap latitude={event.latitude} longitude={event.longitude} label={event.title} />
            </section>
          ) : null}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <p className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-turquoise" />
              <span className="font-medium" suppressHydrationWarning>
                {formatEventDate(event.starts_at, event.ends_at)}
              </span>
            </p>
            {event.location_name ? (
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-turquoise" /> {event.location_name}
              </p>
            ) : null}
            {event.price_info ? (
              <p className="flex items-start gap-3">
                <Tag className="mt-0.5 size-5 shrink-0 text-turquoise" /> {event.price_info}
              </p>
            ) : null}
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <Users className="size-5 text-turquoise" /> {event.attendees_count} pessoa(s) confirmaram presença
            </p>
            {event.status === "approved" ? (
              <AttendanceButtons eventId={event.id} initial={event.my_status ?? null} isLoggedIn={Boolean(user)} slug={event.slug} />
            ) : null}
            <Button asChild variant="outline" className="w-full">
              <a
                href={googleCalendarUrl(event.title, event.starts_at, event.ends_at, event.location_name, `${env.siteUrl}/agenda/${event.slug}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarPlus /> Adicionar ao calendário
              </a>
            </Button>
          </section>
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-bold text-ocean">Organizador</h2>
            <Link href={`/perfil/${event.organizer?.username ?? ""}`} className="mt-3 flex items-center gap-3">
              <UserAvatar name={event.organizer?.full_name} src={event.organizer?.avatar_url} />
              <span className="font-medium">{event.organizer?.full_name}</span>
            </Link>
            <ContactButtons className="mt-3" phone={event.contact_phone} whatsapp={event.contact_whatsapp} compact message={`Olá! Vi o evento "${event.title}" no INHACA CONNECT.`} />
          </section>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/eventos/${event.id}`}>
                  <Pencil /> Editar evento
                </Link>
              </Button>
            ) : null}
            {user && !isOrganizer ? <ReportDialog targetType="event" targetId={event.id} /> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
