"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Sino de notificações com contagem em tempo real (Supabase Realtime). */
export function NotificationBell({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const refresh = async () => {
      const { data } = await supabase.rpc("my_unread_notifications_count");
      if (active) setCount(Number(data ?? 0));
    };
    refresh();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setCount((c) => c + 1);
          const n = payload.new as { title?: string; type?: string };
          // Mensagens têm o seu próprio indicador; evitamos toasts repetitivos.
          if (n.type !== "message" && n.title) toast(n.title);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Notificações${count ? ` (${count} por ler)` : ""}`}>
      <Link href="/notificacoes">
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-coral px-1 text-[10px] leading-4.5 font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
