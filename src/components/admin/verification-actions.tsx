"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { decideVerification } from "@/features/admin/actions";

export function VerificationActions({ id, documentPath }: { id: string; documentPath: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const decide = (approve: boolean) =>
    startTransition(async () => {
      const res = await decideVerification({ id, approve });
      if (res.ok) {
        toast.success(approve ? "Estabelecimento verificado." : "Pedido recusado.");
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <div className="flex flex-wrap gap-2">
      {documentPath ? (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const { data } = await createClient().storage.from("documents").createSignedUrl(documentPath, 300);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
            else toast.error("Não foi possível abrir o documento.");
          }}
        >
          <FileText /> Documento
        </Button>
      ) : null}
      <Button size="sm" variant="turquoise" disabled={pending} onClick={() => decide(true)}>
        <Check /> Verificar
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => decide(false)}>
        <X /> Recusar
      </Button>
    </div>
  );
}
