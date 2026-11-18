"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pause, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { moderateBusiness, moderateEvent } from "@/features/admin/actions";
import type { ContentStatus } from "@/types";

type Decision = "approve" | "reject" | "suspend" | "restore";

/** Ações de aprovação/rejeição/suspensão para estabelecimentos e eventos. */
export function ModerationButtons({ kind, id, status }: { kind: "business" | "event"; id: string; status: ContentStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");

  const run = (decision: Decision, why?: string) =>
    startTransition(async () => {
      const fn = kind === "business" ? moderateBusiness : moderateEvent;
      const res = await fn({ id, decision, reason: why ?? "" });
      if (res.ok) {
        toast.success("Decisão registada.");
        setDialog(null);
        setReason("");
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status !== "approved" ? (
          <Button size="sm" variant="turquoise" disabled={pending} onClick={() => run(status === "suspended" ? "restore" : "approve")}>
            {status === "suspended" ? <RotateCcw /> : <Check />} {status === "suspended" ? "Restaurar" : "Aprovar"}
          </Button>
        ) : null}
        {status === "pending" ? (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setDialog("reject")}>
            <X /> Rejeitar
          </Button>
        ) : null}
        {status === "approved" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog("suspend")}>
            <Pause /> Suspender
          </Button>
        ) : null}
      </div>
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "reject" ? "Rejeitar" : "Suspender"}</DialogTitle>
            <DialogDescription>O motivo é enviado ao autor na notificação.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={500} placeholder="Motivo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pending || (dialog === "reject" && !reason.trim())} onClick={() => dialog && run(dialog, reason)}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
