"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { decideReport } from "@/features/admin/actions";
import type { ReportStatus, ReportTarget } from "@/types";

export function ReportDecision({ id, status, targetType }: { id: string; status: ReportStatus; targetType: ReportTarget }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [hide, setHide] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const decide = (next: ReportStatus) =>
    startTransition(async () => {
      const res = await decideReport({ id, status: next, resolution_notes: notes, hide_target: next === "resolved" && hide });
      if (res.ok) {
        toast.success("Denúncia atualizada.");
        setOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });

  if (status === "resolved" || status === "dismissed") {
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("open")}>
        Reabrir
      </Button>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        {status === "open" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("reviewing")}>
            Em análise
          </Button>
        ) : null}
        <Button size="sm" onClick={() => setOpen(true)}>
          Decidir
        </Button>
      </div>
    );
  }

  const hideLabel: Record<ReportTarget, string> = {
    post: "Ocultar a publicação",
    comment: "Ocultar o comentário",
    message: "Apagar a mensagem",
    business: "Suspender o estabelecimento",
    event: "Suspender o evento",
    product: "Suspender o produto",
    help_request: "Fechar o pedido de ajuda",
    profile: "",
  };

  return (
    <div className="grid w-full gap-2 rounded-xl border bg-muted/40 p-3 lg:w-96">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas da decisão (enviadas ao denunciante)" maxLength={1000} />
      {targetType !== "profile" ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hide} onCheckedChange={(v) => setHide(v === true)} /> {hideLabel[targetType]}
        </label>
      ) : (
        <p className="text-xs text-muted-foreground">Para suspender uma conta use a gestão de utilizadores (administradores).</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="turquoise" disabled={pending} onClick={() => decide("resolved")}>
          Resolver
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("dismissed")}>
          Arquivar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
