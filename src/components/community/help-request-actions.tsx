"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteHelpRequest, setHelpRequestStatus } from "@/features/community/actions";
import type { HelpRequestStatus } from "@/types";

export function HelpRequestActions({ id, status }: { id: string; status: HelpRequestStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (s: HelpRequestStatus) =>
    startTransition(async () => {
      const res = await setHelpRequestStatus(id, s);
      if (res.ok) {
        toast.success("Estado atualizado.");
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <>
          <Button variant="turquoise" onClick={() => change("resolved")} disabled={pending}>
            <CheckCircle2 /> Marcar como resolvido
          </Button>
          <Button variant="outline" onClick={() => change("closed")} disabled={pending}>
            <XCircle /> Fechar
          </Button>
        </>
      ) : (
        <Button variant="outline" onClick={() => change("open")} disabled={pending}>
          <RotateCcw /> Reabrir
        </Button>
      )}
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          confirm("Eliminar este pedido?") &&
          startTransition(async () => {
            const res = await deleteHelpRequest(id);
            if (res.ok) {
              toast.success("Pedido eliminado.");
              router.push("/comunidade/ajuda");
            } else toast.error(res.error);
          })
        }
      >
        <Trash2 /> Eliminar
      </Button>
    </div>
  );
}
