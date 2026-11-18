"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogIn, LogOut, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/features/community/actions";

export function JoinGroupButton({
  groupId,
  conversationId,
  isMember,
  isLoggedIn,
  slug,
}: {
  groupId: string;
  conversationId: string;
  isMember: boolean;
  isLoggedIn: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Button onClick={() => router.push(`/entrar?next=/comunidade/grupos/${slug}`)}>
        <LogIn /> Entrar para participar
      </Button>
    );
  }
  if (isMember) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => router.push(`/comunidade/mensagens/${conversationId}`)} variant="turquoise">
          <MessagesSquare /> Abrir conversa do grupo
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            confirm("Sair deste grupo?") &&
            startTransition(async () => {
              const res = await joinGroup(groupId, false);
              if (res.ok) {
                toast.success("Saiu do grupo.");
                router.refresh();
              } else toast.error(res.error);
            })
          }
        >
          <LogOut /> Sair
        </Button>
      </div>
    );
  }
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await joinGroup(groupId, true);
          if (res.ok) {
            toast.success("Bem-vindo ao grupo!");
            router.push(`/comunidade/mensagens/${conversationId}`);
          } else toast.error(res.error);
        })
      }
    >
      {pending ? "A aderir…" : "Aderir ao grupo"}
    </Button>
  );
}
