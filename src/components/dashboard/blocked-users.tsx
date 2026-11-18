"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { toggleBlock } from "@/features/profiles/actions";
import type { ProfileSummary } from "@/types";

export function BlockedUsers({ users }: { users: ProfileSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!users.length) return <p className="text-sm text-muted-foreground">Não bloqueou nenhum utilizador.</p>;
  return (
    <ul className="divide-y">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 py-2.5">
          <UserAvatar name={u.full_name} src={u.avatar_url} size="sm" />
          <span className="flex-1 truncate text-sm font-medium">{u.full_name}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await toggleBlock({ user_id: u.id }, false);
                if (res.ok) {
                  toast.success("Bloqueio removido.");
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            Desbloquear
          </Button>
        </li>
      ))}
    </ul>
  );
}
