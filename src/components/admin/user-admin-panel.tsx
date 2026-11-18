"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { changeUserRole, setUserBanned } from "@/features/admin/actions";
import { ASSIGNABLE_ROLES } from "@/lib/permissions/roles";
import { roleLabels } from "@/config/site";
import type { AppRole } from "@/types";

export function UserAdminPanel({
  userId,
  roles,
  isBanned,
  isSelf,
}: {
  userId: string;
  roles: AppRole[];
  isBanned: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  const toggleRole = (role: AppRole, grant: boolean) =>
    startTransition(async () => {
      const res = await changeUserRole({ user_id: userId, role, action: grant ? "grant" : "revoke" });
      if (res.ok) {
        toast.success(grant ? `Papel "${roleLabels[role]}" atribuído.` : `Papel "${roleLabels[role]}" removido.`);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-ocean">Papéis e permissões</h2>
        <p className="mt-1 text-sm text-muted-foreground">Um utilizador pode ter vários papéis. As alterações ficam registadas na auditoria.</p>
        <ul className="mt-4 divide-y rounded-xl border">
          {ASSIGNABLE_ROLES.map((role) => {
            const has = roles.includes(role);
            const locked = isSelf && role === "admin";
            return (
              <li key={role} className="flex min-h-12 items-center justify-between gap-3 px-3">
                <span className="text-sm font-medium">{roleLabels[role]}</span>
                <Switch
                  checked={has}
                  disabled={pending || locked}
                  onCheckedChange={(v) => {
                    if ((role === "admin" || role === "moderator") && v && !confirm(`Atribuir o papel "${roleLabels[role]}"?`)) return;
                    toggleRole(role, v);
                  }}
                  aria-label={roleLabels[role]}
                />
              </li>
            );
          })}
        </ul>
      </section>
      {!isSelf ? (
        <section className="rounded-2xl border border-destructive/30 bg-card p-4 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ocean">
            {isBanned ? <ShieldCheck className="size-5 text-turquoise" /> : <ShieldAlert className="size-5 text-destructive" />}
            {isBanned ? "Conta suspensa" : "Suspender conta"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A suspensão impede publicar, comentar e enviar mensagens. Com a chave privilegiada configurada, bloqueia também o
            início de sessão.
          </p>
          {!isBanned ? (
            <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (fica na auditoria)" rows={2} />
          ) : null}
          <Button
            className="mt-3"
            variant={isBanned ? "turquoise" : "destructive"}
            disabled={pending}
            onClick={() =>
              confirm(isBanned ? "Reativar esta conta?" : "Suspender esta conta?") &&
              startTransition(async () => {
                const res = await setUserBanned({ user_id: userId, banned: !isBanned, reason });
                if (res.ok) {
                  toast.success(isBanned ? "Conta reativada." : "Conta suspensa.");
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {isBanned ? "Reativar conta" : "Suspender conta"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
