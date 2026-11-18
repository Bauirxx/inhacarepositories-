"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { RelativeTime } from "./relative-time";
import { UserAvatar } from "./user-avatar";
import { deleteNotification, markNotificationsRead } from "@/features/profiles/actions";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationsList({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.is_read).length;

  if (!items.length) return <EmptyState icon={Bell} title="Sem notificações" description="As novidades sobre a sua atividade aparecem aqui." />;

  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await markNotificationsRead();
                if (res.ok) router.refresh();
                else toast.error(res.error);
              })
            }
          >
            <CheckCheck /> Marcar todas como lidas
          </Button>
        </div>
      ) : null}
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map((n) => {
          const content = (
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {n.actor ? (
                <UserAvatar name={n.actor.full_name} src={n.actor.avatar_url} size="sm" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-turquoise-light text-ocean">
                  <Bell className="size-4" />
                </span>
              )}
              <div className="min-w-0">
                <p className={cn("text-sm", !n.is_read && "font-semibold text-ocean")}>{n.title}</p>
                {n.body ? <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <RelativeTime value={n.created_at} />
                </p>
              </div>
            </div>
          );
          return (
            <li key={n.id} className={cn("flex items-start gap-2 p-3", !n.is_read && "bg-turquoise-light/40")}>
              {n.link && n.link.startsWith("/") ? (
                <Link
                  href={n.link}
                  className="flex min-w-0 flex-1"
                  onClick={() => {
                    if (!n.is_read) markNotificationsRead([n.id]);
                  }}
                >
                  {content}
                </Link>
              ) : (
                content
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Eliminar notificação"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteNotification(n.id);
                    if (res.ok) router.refresh();
                    else toast.error(res.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
