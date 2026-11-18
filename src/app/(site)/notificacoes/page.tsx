import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsList } from "@/components/shared/notifications-list";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listNotifications } from "@/services/notifications";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/notificacoes");
  const items = await listNotifications(await createClient(), user.id, 50);
  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <PageHeader title="Notificações" />
      <NotificationsList items={items} />
    </div>
  );
}
