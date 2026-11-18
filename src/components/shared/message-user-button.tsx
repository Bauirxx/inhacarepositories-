"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startDirectConversation } from "@/features/messaging/actions";

/** Inicia (ou abre) uma conversa privada com outro utilizador. */
export function MessageUserButton({
  userId,
  isLoggedIn,
  label = "Enviar mensagem",
  variant = "outline",
  size = "default",
  className,
}: {
  userId: string;
  isLoggedIn: boolean;
  label?: string;
  variant?: "outline" | "default" | "turquoise";
  size?: "default" | "sm";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (!isLoggedIn) {
          router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        startTransition(async () => {
          const res = await startDirectConversation(userId);
          if (res.ok) router.push(`/comunidade/mensagens/${res.data.id}`);
          else toast.error(res.error);
        });
      }}
    >
      <MessageCircle /> {pending ? "A abrir…" : label}
    </Button>
  );
}
