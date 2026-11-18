"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EyeOff } from "lucide-react";
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
import { setPostHidden } from "@/features/admin/actions";

export function HidePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
        <EyeOff /> Ocultar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocultar publicação</DialogTitle>
            <DialogDescription>A publicação deixa de estar visível no feed. O autor continua a vê-la com o motivo.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" rows={3} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await setPostHidden({ id, hidden: true, reason });
                  if (res.ok) {
                    toast.success("Publicação ocultada.");
                    setOpen(false);
                    router.refresh();
                  } else toast.error(res.error);
                })
              }
            >
              Ocultar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
