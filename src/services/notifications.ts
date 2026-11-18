import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types";

export const NOTIFICATION_SELECT =
  "*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)";

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationsCount(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.rpc("my_unread_notifications_count");
  return Number(data ?? 0);
}
