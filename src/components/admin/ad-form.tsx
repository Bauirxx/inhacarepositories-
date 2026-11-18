"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { saveAdvertisement } from "@/features/admin/actions";
import { advertisementSchema, type AdvertisementInput } from "@/lib/validations/admin";
import { isoToIslandLocal } from "@/lib/utils";
import type { Advertisement } from "@/types";

const placements = [
  { value: "home", label: "Página inicial" },
  { value: "feed", label: "Feed (lateral)" },
  { value: "directory", label: "Diretório de serviços" },
  { value: "sidebar", label: "Barra lateral" },
];

export function AdFormDialog({ ad, userId }: { ad?: Advertisement; userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<AdvertisementInput>({
    resolver: zodResolver(advertisementSchema) as never,
    defaultValues: {
      title: ad?.title ?? "",
      advertiser_name: ad?.advertiser_name ?? "",
      image_url: ad?.image_url ?? "",
      link_url: ad?.link_url ?? "",
      placement: ad?.placement ?? "home",
      starts_at: isoToIslandLocal(ad?.starts_at),
      ends_at: isoToIslandLocal(ad?.ends_at),
      is_active: ad?.is_active ?? true,
    },
  });
  const { errors } = form.formState;
  const image = form.watch("image_url");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {ad ? (
          <Button size="sm" variant="outline">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <Plus /> Novo anúncio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad ? "Editar anúncio" : "Novo anúncio"}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              const res = await saveAdvertisement(values, ad?.id);
              if (res.ok) {
                toast.success("Anúncio guardado.");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }),
          )}
        >
          <FormField id="ad-title" label="Título" error={errors.title?.message} required>
            <Input id="ad-title" {...form.register("title")} />
          </FormField>
          <FormField id="ad-adv" label="Anunciante">
            <Input id="ad-adv" {...form.register("advertiser_name")} />
          </FormField>
          <FormField id="ad-img" label="Imagem (banner 4:1)">
            <ImageUploader bucket="post-media" folder={userId} value={image ? [image] : []} onChange={(u) => form.setValue("image_url", u[0] ?? "")} aspect="wide" />
          </FormField>
          <FormField id="ad-link" label="Ligação" error={errors.link_url?.message}>
            <Input id="ad-link" type="url" placeholder="https://" {...form.register("link_url")} />
          </FormField>
          <FormField id="ad-place" label="Posição">
            <select id="ad-place" {...form.register("placement")} className="h-11 rounded-xl border bg-card px-3">
              {placements.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ad-start" label="Início">
              <Input id="ad-start" type="datetime-local" {...form.register("starts_at")} />
            </FormField>
            <FormField id="ad-end" label="Fim">
              <Input id="ad-end" type="datetime-local" {...form.register("ends_at")} />
            </FormField>
          </div>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            Ativo
            <Switch checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", v)} />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
