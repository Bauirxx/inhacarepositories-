import { weekDays } from "@/config/site";
import type { OpeningHours } from "@/types";

export function OpeningHoursTable({ hours }: { hours: OpeningHours }) {
  const defined = weekDays.filter((d) => hours?.[d.key]);
  if (defined.length === 0) return <p className="text-sm text-muted-foreground">Horário não indicado.</p>;
  return (
    <dl className="divide-y text-sm">
      {weekDays.map((d) => {
        const h = hours?.[d.key];
        return (
          <div key={d.key} className="flex justify-between py-2">
            <dt className="text-muted-foreground">{d.label}</dt>
            <dd className="font-medium">{!h ? "—" : h.closed ? "Fechado" : `${h.open} – ${h.close}`}</dd>
          </div>
        );
      })}
    </dl>
  );
}
