import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "@/config/site";
import type { AttendeeStatus, ContentStatus, Event, EventCategory } from "@/types";

export const EVENT_SELECT =
  "*, organizer:profiles(id, username, full_name, avatar_url)";

export interface ListEventsParams {
  category?: EventCategory | null;
  from?: string;
  to?: string;
  past?: boolean;
  page?: number;
  pageSize?: number;
  userId?: string | null;
}

async function decorateEvents(supabase: SupabaseClient, events: Event[], userId?: string | null): Promise<Event[]> {
  if (!userId || events.length === 0) return events;
  const { data } = await supabase
    .from("event_attendees")
    .select("event_id, status")
    .eq("user_id", userId)
    .in(
      "event_id",
      events.map((e) => e.id),
    );
  const map = new Map<string, AttendeeStatus>();
  (data ?? []).forEach((r: { event_id: string; status: AttendeeStatus }) => map.set(r.event_id, r.status));
  return events.map((e) => ({ ...e, my_status: map.get(e.id) ?? null }));
}

export async function listEvents(
  supabase: SupabaseClient,
  params: ListEventsParams = {},
): Promise<{ items: Event[]; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const nowIso = new Date().toISOString();

  let query = supabase.from("events").select(EVENT_SELECT).eq("status", "approved");
  if (params.category) query = query.eq("category", params.category);
  if (params.from) query = query.gte("starts_at", params.from);
  if (params.to) query = query.lte("starts_at", params.to);

  if (params.past) {
    query = query.lt("starts_at", nowIso).order("starts_at", { ascending: false });
  } else if (!params.from && !params.to) {
    query = query.or(`starts_at.gte.${nowIso},ends_at.gte.${nowIso}`).order("starts_at", { ascending: true });
  } else {
    query = query.order("starts_at", { ascending: true });
  }

  const { data } = await query.range(from, from + pageSize);
  const rows = (data ?? []) as Event[];
  const items = await decorateEvents(supabase, rows.slice(0, pageSize), params.userId);
  return { items, hasMore: rows.length > pageSize };
}

export async function listUpcomingEvents(supabase: SupabaseClient, limit = 4): Promise<Event[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "approved")
    .or(`starts_at.gte.${nowIso},ends_at.gte.${nowIso}`)
    .order("is_featured", { ascending: false })
    .order("starts_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as Event[];
}

export async function listEventsForMonth(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<Event[]> {
  // Limites do mês na hora da ilha (UTC+2).
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const start = new Date(`${year}-${pad(month)}-01T00:00:00+02:00`);
  const end = new Date(`${next.y}-${pad(next.m)}-01T00:00:00+02:00`);
  const { data } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "approved")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .limit(300);
  return (data ?? []) as Event[];
}

export async function getEventBySlug(
  supabase: SupabaseClient,
  slug: string,
  userId?: string | null,
): Promise<Event | null> {
  const { data } = await supabase.from("events").select(EVENT_SELECT).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const [event] = await decorateEvents(supabase, [data as Event], userId);
  return event;
}

export async function getEventById(supabase: SupabaseClient, id: string): Promise<Event | null> {
  const { data } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle();
  return (data as Event) ?? null;
}

export async function listMyEvents(supabase: SupabaseClient, organizerId: string): Promise<Event[]> {
  const { data } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("organizer_id", organizerId)
    .order("starts_at", { ascending: false });
  return (data ?? []) as Event[];
}

export async function listEventsForAdmin(
  supabase: SupabaseClient,
  params: { status?: ContentStatus | "all"; page?: number } = {},
): Promise<{ items: Event[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  let query = supabase.from("events").select(EVENT_SELECT, { count: "exact" });
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize);
  const rows = (data ?? []) as Event[];
  return { items: rows.slice(0, pageSize), total: count ?? 0, hasMore: rows.length > pageSize };
}
