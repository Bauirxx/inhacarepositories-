import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { CoverImage } from "@/components/shared/cover-image";
import { eventCategoryLabels } from "@/config/site";
import { formatDate, formatEventDate } from "@/lib/utils";
import type { Event } from "@/types";

export function EventDateBadge({ date }: { date: string }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-card py-1.5 text-center shadow-md">
      <span className="text-[10px] font-bold text-coral uppercase">{formatDate(date, "MMM")}</span>
      <span className="text-xl leading-none font-extrabold text-ocean">{formatDate(date, "d")}</span>
      <span className="text-[10px] text-muted-foreground">{formatDate(date, "EEE")}</span>
    </div>
  );
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/agenda/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <CoverImage src={event.cover_url} alt={event.title} className="aspect-[16/9]" icon={CalendarDays} />
        <div className="absolute top-3 left-3">
          <EventDateBadge date={event.starts_at} />
        </div>
        <span className="absolute top-3 right-3 rounded-full bg-ocean/85 px-2.5 py-1 text-[11px] font-semibold text-white">
          {eventCategoryLabels[event.category]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold text-ocean group-hover:text-turquoise">{event.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0 text-turquoise" aria-hidden />
          <span suppressHydrationWarning>{formatEventDate(event.starts_at, event.ends_at)}</span>
        </p>
        {event.location_name ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-turquoise" aria-hidden />
            <span className="truncate">{event.location_name}</span>
          </p>
        ) : null}
        {event.attendees_count > 0 ? (
          <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden /> {event.attendees_count} vão participar
          </p>
        ) : null}
      </div>
    </Link>
  );
}
