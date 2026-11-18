import { format, formatDistanceToNowStrict, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";

/** Moçambique: UTC+2 fixo (sem horário de verão). */
export const ISLAND_UTC_OFFSET_MINUTES = 120;
export const ISLAND_TZ_SUFFIX = "+02:00";

/**
 * Devolve um Date cujos componentes "locais" (getHours, getDate…) correspondem
 * à hora da Ilha de Inhaca, independentemente do fuso do servidor/browser.
 */
export function toIslandTime(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getTime() + (ISLAND_UTC_OFFSET_MINUTES + d.getTimezoneOffset()) * 60_000);
}

/** Converte "YYYY-MM-DDTHH:mm" (hora da ilha) para ISO UTC. */
export function islandLocalToIso(local: string): string {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(local)) return new Date(local).toISOString();
  const withSeconds = local.length === 16 ? `${local}:00` : local;
  return new Date(`${withSeconds}${ISLAND_TZ_SUFFIX}`).toISOString();
}

/** Converte ISO UTC para valor de <input type="datetime-local"> na hora da ilha. */
export function isoToIslandLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = toIslandTime(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function formatDate(value: string | Date, pattern = "d 'de' MMMM 'de' yyyy"): string {
  const raw = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(raw.getTime())) return "";
  return format(toIslandTime(raw), pattern, { locale: pt });
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, "d MMM yyyy, HH:mm");
}

export function formatTime(value: string | Date): string {
  return formatDate(value, "HH:mm");
}

export function formatRelative(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "agora";
  return formatDistanceToNowStrict(date, { locale: pt, addSuffix: true });
}

/** Ex.: "Hoje, 18:00" / "Amanhã, 10:00" / "sáb, 12 abr, 20:00" */
export function formatEventDate(startsAt: string, endsAt?: string | null): string {
  const rawStart = new Date(startsAt);
  if (Number.isNaN(rawStart.getTime())) return "";
  const start = toIslandTime(rawStart);
  const now = toIslandTime(new Date());
  const tomorrow = new Date(now.getTime() + 86_400_000);
  let day: string;
  if (isSameDay(start, now)) day = "Hoje";
  else if (isSameDay(start, tomorrow)) day = "Amanhã";
  else day = format(start, "EEE, d MMM", { locale: pt });
  const time = format(start, "HH:mm", { locale: pt });
  let result = `${day}, ${time}`;
  if (endsAt) {
    const rawEnd = new Date(endsAt);
    if (!Number.isNaN(rawEnd.getTime())) {
      const end = toIslandTime(rawEnd);
      result += isSameDay(start, end)
        ? ` – ${format(end, "HH:mm", { locale: pt })}`
        : ` – ${format(end, "d MMM, HH:mm", { locale: pt })}`;
    }
  }
  return result;
}

export function formatMoney(value: number | null | undefined, currency = "MZN"): string {
  if (value === null || value === undefined) return "Sob consulta";
  try {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-PT", { notation: "compact" }).format(value);
}

export function truncate(text: string, max = 140): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
