"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { uploadFile, UploadError } from "@/lib/upload";
import { deleteBusiness, requestVerification } from "@/features/businesses/actions";
import type { BusinessVerification } from "@/types";
import { formatDate } from "@/lib/utils";

export function BusinessManagePanel({
  businessId,
  userId,
  isVerified,
  verifications,
}: {
  businessId: string;
  userId: string;
  isVerified: boolean;
  verifications: BusinessVerification[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [doc, setDoc] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasPending = verifications.some((v) => v.status === "pending");

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ocean">
          <BadgeCheck className="size-5 text-turquoise" /> Verificação
        </h2>
        {isVerified ? (
          <p className="mt-2 text-sm text-emerald-700">Este estabelecimento está verificado.</p>
        ) : hasPending ? (
          <p className="mt-2 text-sm text-muted-foreground">O seu pedido de verificação está em análise.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-muted-foreground">
              O selo de verificado indica que a administração confirmou a identidade e a atividade do negócio. Pode anexar
              um documento (licença, alvará, NUIT) em PDF ou imagem — só a administração o pode ver.
            </p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas para a administração (opcional)" rows={3} maxLength={1000} />
            <label className="text-sm">
              <span className="font-medium">Documento (opcional)</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="mt-1 block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-muted file:px-3"
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const r = await uploadFile(f, "documents", userId);
                    setDoc(r.path);
                    toast.success("Documento anexado.");
                  } catch (err) {
                    toast.error(err instanceof UploadError ? err.message : "Falha no envio.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            <Button
              className="w-fit"
              disabled={pending || uploading}
              onClick={() =>
                startTransition(async () => {
                  const res = await requestVerification({ business_id: businessId, notes, document_url: doc });
                  if (res.ok) {
                    toast.success("Pedido de verificação enviado.");
                    router.refresh();
                  } else toast.error(res.error);
                })
              }
            >
              Pedir verificação
            </Button>
          </div>
        )}
        {verifications.length ? (
          <ul className="mt-4 divide-y border-t text-sm">
            {verifications.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2">
                <span>Pedido de {formatDate(v.created_at)}</span>
                <ContentStatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="rounded-2xl border border-destructive/30 bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-destructive">Zona de perigo</h2>
        <p className="mt-1 text-sm text-muted-foreground">Eliminar remove definitivamente o estabelecimento, avaliações e fotografias associadas.</p>
        <Button
          variant="destructive"
          className="mt-3"
          disabled={pending}
          onClick={() =>
            confirm("Eliminar definitivamente este estabelecimento?") &&
            startTransition(async () => {
              const res = await deleteBusiness(businessId);
              if (res.ok) {
                toast.success("Estabelecimento eliminado.");
                router.push("/dashboard/negocios");
              } else toast.error(res.error);
            })
          }
        >
          <Trash2 /> Eliminar estabelecimento
        </Button>
      </section>
    </div>
  );
}
