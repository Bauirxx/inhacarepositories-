"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { helpRequestTypeLabels } from "@/config/site";
import { saveHelpRequest } from "@/features/community/actions";
import { helpRequestSchema, type HelpRequestInput } from "@/lib/validations/community";
import type { HelpRequest } from "@/types";

export function HelpRequestForm({ initial, onDone }: { initial?: HelpRequest; onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<HelpRequestInput>({
    resolver: zodResolver(helpRequestSchema),
    defaultValues: {
      type: initial?.type ?? "transporte",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      location: initial?.location ?? "",
      contact_phone: initial?.contact_phone ?? "",
      contact_whatsapp: initial?.contact_whatsapp ?? "",
    },
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await saveHelpRequest(values, initial?.id);
          if (res.ok) {
            toast.success(initial ? "Pedido atualizado." : "Pedido publicado.");
            form.reset();
            onDone?.();
            router.push(`/comunidade/ajuda/${res.data.id}`);
            router.refresh();
          } else toast.error(res.error);
        }),
      )}
    >
      <FormField id="type" label="Tipo de pedido" error={errors.type?.message}>
        <select id="type" {...form.register("type")} className="h-11 rounded-xl border bg-card px-3">
          {Object.entries(helpRequestTypeLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="title" label="Título" error={errors.title?.message} required>
        <Input id="title" placeholder="Ex.: Preciso de boleia até ao cais amanhã de manhã" {...form.register("title")} />
      </FormField>
      <FormField id="description" label="Descrição" error={errors.description?.message} required>
        <Textarea id="description" rows={4} {...form.register("description")} />
      </FormField>
      <FormField id="location" label="Local" error={errors.location?.message}>
        <Input id="location" {...form.register("location")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="contact_whatsapp" label="WhatsApp" error={errors.contact_whatsapp?.message}>
          <Input id="contact_whatsapp" type="tel" inputMode="tel" placeholder="84 123 4567" {...form.register("contact_whatsapp")} />
        </FormField>
        <FormField id="contact_phone" label="Telefone" error={errors.contact_phone?.message}>
          <Input id="contact_phone" type="tel" inputMode="tel" {...form.register("contact_phone")} />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "A publicar…" : initial ? "Guardar alterações" : "Publicar pedido"}
      </Button>
    </form>
  );
}
