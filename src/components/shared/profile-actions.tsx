"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleBlock, toggleFollow } from "@/features/profiles/actions";
import { MessageUserButton } from "./message-user-button";
import { ReportDialog } from "./report-dialog";

export function ProfileActions({
  userId,
  isFollowing,
  isBlocked,
  isLoggedIn,
}: {
  userId: string;
  isFollowing: boolean;
  isBlocked: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(isFollowing);
  const [blocked, setBlocked] = useState(isBlocked);
  const [pending, startTransition] = useTransition();

  const requireLogin = () => {
    if (!isLoggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!blocked ? (
        <>
          <Button
            variant={following ? "outline" : "default"}
            disabled={pending}
            onClick={() => {
              if (!requireLogin()) return;
              const next = !following;
              setFollowing(next);
              startTransition(async () => {
                const res = await toggleFollow(userId, next);
                if (!res.ok) {
                  setFollowing(!next);
                  toast.error(res.error);
                } else router.refresh();
              });
            }}
          >
            {following ? <UserCheck /> : <UserPlus />} {following ? "A seguir" : "Seguir"}
          </Button>
          <MessageUserButton userId={userId} isLoggedIn={isLoggedIn} label="Mensagem" />
        </>
      ) : null}
      {isLoggedIn ? (
        <>
          <Button
            variant="ghost"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() => {
              const next = !blocked;
              if (next && !confirm("Bloquear este utilizador? Não poderá enviar-lhe mensagens.")) return;
              startTransition(async () => {
                const res = await toggleBlock({ user_id: userId }, next);
                if (res.ok) {
                  setBlocked(next);
                  if (next) setFollowing(false);
                  toast.success(next ? "Utilizador bloqueado." : "Bloqueio removido.");
                } else toast.error(res.error);
              });
            }}
          >
            <Ban /> {blocked ? "Desbloquear" : "Bloquear"}
          </Button>
          <ReportDialog targetType="profile" targetId={userId} />
        </>
      ) : null}
    </div>
  );
}
