"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Image as ImageIcon, MessagesSquare } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { RelativeTime } from "@/components/shared/relative-time";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types";

/** Caixa de entrada com indicadores de não lidas, atualizada em tempo real. */
export function ConversationList({ initial, meId }: { initial: ConversationSummary[]; meId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`inbox:${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [meId, router]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Sem conversas"
        description="Inicie uma conversa a partir do perfil de um utilizador, de um estabelecimento ou de um produto."
      />
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card shadow-sm">
      {items.map((c) => {
        const href = c.type === "general" ? "/comunidade/chat" : `/comunidade/mensagens/${c.id}`;
        const name = c.type === "direct" ? c.other_user?.full_name ?? "Conversa" : c.title ?? "Grupo";
        const preview = c.last_message
          ? c.last_message.content
            ? c.last_message.content
            : c.last_message.image_url
              ? "📷 Fotografia"
              : "Mensagem apagada"
          : "Sem mensagens";
        return (
          <li key={c.id}>
            <Link href={href} className="flex min-h-16 items-center gap-3 p-3 transition-colors hover:bg-muted">
              {c.type === "direct" ? (
                <UserAvatar name={c.other_user?.full_name} src={c.other_user?.avatar_url} />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-turquoise-light text-ocean">
                  {c.type === "general" ? <Globe className="size-5" /> : <DynamicIcon name={c.group_icon} className="size-5" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-ocean", c.unread_count > 0 ? "font-bold" : "font-semibold")}>{name}</p>
                  {c.last_message ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <RelativeTime value={c.last_message.created_at} />
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {c.last_message?.sender_id === meId ? "Você: " : ""}
                    {c.last_message?.image_url && !c.last_message.content ? <ImageIcon className="mr-1 inline size-3.5" /> : null}
                    {preview}
                  </p>
                  {c.unread_count > 0 ? (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-turquoise px-1.5 text-xs leading-5 font-bold text-white">
                      {c.unread_count > 99 ? "99+" : c.unread_count}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
