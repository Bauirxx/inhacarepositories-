"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportReasons } from "@/config/site";
import { submitReport } from "@/features/community/actions";
import type { ReportTarget } from "@/types";
import { cn } from "@/lib/utils";

export function ReportDialog({
  targetType,
  targetId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  targetType: ReportTarget;
  targetId: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) {
      toast.error("Escolha um motivo.");
      return;
    }
    startTransition(async () => {
      const result = await submitReport({
        target_type: targetType,
        target_id: targetId,
        reason: reason as "spam",
        details,
      });
      if (result.ok) {
        toast.success("Denúncia enviada. Obrigado por ajudar a manter a comunidade segura.");
        setOpen(false);
        setReason("");
        setDetails("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag /> Denunciar
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar conteúdo</DialogTitle>
          <DialogDescription>A equipa de moderação vai analisar a sua denúncia de forma confidencial.</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Motivo</legend>
          {reportReasons.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors",
                reason === r.value ? "border-turquoise bg-turquoise-light" : "hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-[#20A6A0]"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-2">
          <Label htmlFor="report-details">Detalhes (opcional)</Label>
          <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "A enviar…" : "Enviar denúncia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
