import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatTime, toIslandTime } from "@/lib/utils";
import type { Event } from "@/types";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function key(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Vista de calendário mensal (renderizada no servidor).
 * Mobile: lista agrupada por dia; ≥ md: grelha mensal.
 */
export function EventCalendar({ year, month, events }: { year: number; month: number; events: Event[] }) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // segunda = 0
  const byDay = new Map<string, Event[]>();
  events.forEach((e) => {
    const k = key(toIslandTime(e.starts_at));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  });
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const today = key(toIslandTime(new Date()));
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <Button asChild variant="ghost" size="icon" aria-label="Mês anterior">
          <Link href={`/agenda?vista=calendario&mes=${prev.y}-${String(prev.m).padStart(2, "0")}`} scroll={false}>
            <ChevronLeft />
          </Link>
        </Button>
        <h2 className="text-lg font-bold text-ocean capitalize">{formatDate(first, "MMMM yyyy")}</h2>
        <Button asChild variant="ghost" size="icon" aria-label="Mês seguinte">
          <Link href={`/agenda?vista=calendario&mes=${next.y}-${String(next.m).padStart(2, "0")}`} scroll={false}>
            <ChevronRight />
          </Link>
        </Button>
      </div>

      {/* Grelha (tablet/desktop) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const k = day ? key(new Date(year, month - 1, day)) : `e${i}`;
            const list = day ? byDay.get(k) ?? [] : [];
            return (
              <div key={k} className={cn("min-h-28 border-r border-b p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0", !day && "bg-muted/40")}>
                {day ? (
                  <>
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-sm",
                        k === today && "bg-turquoise font-bold text-white",
                      )}
                    >
                      {day}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {list.slice(0, 3).map((e) => (
                        <li key={e.id}>
                          <Link
                            href={`/agenda/${e.slug}`}
                            className="block truncate rounded-md bg-turquoise-light px-1.5 py-1 text-xs font-medium text-ocean hover:bg-turquoise hover:text-white"
                            title={e.title}
                          >
                            {formatTime(e.starts_at)} {e.title}
                          </Link>
                        </li>
                      ))}
                      {list.length > 3 ? <li className="px-1.5 text-xs text-muted-foreground">+{list.length - 3} mais</li> : null}
                    </ul>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista por dia (mobile) */}
      <div className="md:hidden">
        {events.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sem eventos neste mês.</p>
        ) : (
          <ul className="divide-y">
            {Array.from(byDay.entries()).map(([k, list]) => (
              <li key={k} className="flex gap-3 p-3">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-xs font-semibold text-coral uppercase">{formatDate(list[0].starts_at, "EEE")}</p>
                  <p className="text-2xl font-extrabold text-ocean">{formatDate(list[0].starts_at, "d")}</p>
                </div>
                <ul className="flex-1 space-y-2">
                  {list.map((e) => (
                    <li key={e.id}>
                      <Link href={`/agenda/${e.slug}`} className="block rounded-xl bg-muted/60 p-2.5">
                        <span className="block text-sm font-semibold text-ocean">{e.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(e.starts_at)}
                          {e.location_name ? ` · ${e.location_name}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
