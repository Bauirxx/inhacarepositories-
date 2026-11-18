"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { LocationPicker } from "@/components/map/location-picker";
import { eventCategoryLabels } from "@/config/site";
import { deleteEvent, saveEvent } from "@/features/events/actions";
import { eventSchema, type EventInput } from "@/lib/validations/event";
import { isoToIslandLocal } from "@/lib/utils";
import type { Business, Event } from "@/types";

export function EventForm({
  userId,
  event,
  businesses,
  defaults,
}: {
  userId: string;
  event?: Event | null;
  businesses: Pick<Business, "id" | "name">[];
  defaults?: { phone?: string | null; whatsapp?: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema) as never,
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      category: event?.category ?? "comunidade",
      cover_url: event?.cover_url ?? "",
      starts_at: isoToIslandLocal(event?.starts_at),
      ends_at: isoToIslandLocal(event?.ends_at),
      location_name: event?.location_name ?? "",
      latitude: event?.latitude ?? null,
      longitude: event?.longitude ?? null,
      business_id: event?.business_id ?? null,
      contact_phone: event?.contact_phone ?? defaults?.phone ?? "",
      contact_whatsapp: event?.contact_whatsapp ?? defaults?.whatsapp ?? "",
      price_info: event?.price_info ?? "",
    },
  });
  const { errors } = form.formState;
  const cover = form.watch("cover_url");

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit(
        (values) =>
          startTransition(async () => {
            const res = await saveEvent(values, event?.id);
            if (res.ok) {
              toast.success(event ? "Evento atualizado." : "Evento submetido! Será publicado após aprovação.");
              router.push("/dashboard/eventos");
              router.refresh();
            } else toast.error(res.error);
          }),
        () => toast.error("Verifique os campos assinalados."),
      )}
    >
      <FormSection title="Evento">
        <FormField id="title" label="Título" error={errors.title?.message} required>
          <Input id="title" {...form.register("title")} />
        </FormField>
        <FormField id="category" label="Categoria" error={errors.category?.message}>
          <select id="category" {...form.register("category")} className="h-11 rounded-xl border bg-card px-3">
            {Object.entries(eventCategoryLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="description" label="Descrição" error={errors.description?.message}>
          <Textarea id="description" rows={6} {...form.register("description")} />
        </FormField>
        <FormField id="cover" label="Imagem de capa">
          <ImageUploader
            bucket="event-media"
            folder={userId}
            value={cover ? [cover] : []}
            onChange={(u) => form.setValue("cover_url", u[0] ?? "", { shouldDirty: true })}
          />
        </FormField>
      </FormSection>
      <FormSection title="Data e hora" description="Hora de Moçambique (CAT, UTC+2).">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="starts_at" label="Início" error={errors.starts_at?.message} required>
            <Input id="starts_at" type="datetime-local" {...form.register("starts_at")} />
          </FormField>
          <FormField id="ends_at" label="Fim" error={errors.ends_at?.message}>
            <Input id="ends_at" type="datetime-local" {...form.register("ends_at")} />
          </FormField>
        </div>
        <FormField id="price_info" label="Entrada / preço" hint="Ex.: Entrada livre, 200 MZN" error={errors.price_info?.message}>
          <Input id="price_info" {...form.register("price_info")} />
        </FormField>
      </FormSection>
      <FormSection title="Local">
        <FormField id="location_name" label="Nome do local" error={errors.location_name?.message}>
          <Input id="location_name" placeholder="Ex.: Campo de futebol da vila" {...form.register("location_name")} />
        </FormField>
        {businesses.length ? (
          <FormField id="business_id" label="Associar a um dos meus estabelecimentos (opcional)">
            <select
              id="business_id"
              className="h-11 rounded-xl border bg-card px-3"
              value={form.watch("business_id") ?? ""}
              onChange={(e) => form.setValue("business_id", e.target.value || null)}
            >
              <option value="">Nenhum</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        <LocationPicker
          latitude={form.watch("latitude")}
          longitude={form.watch("longitude")}
          onChange={({ latitude, longitude }) => {
            form.setValue("latitude", latitude);
            form.setValue("longitude", longitude);
          }}
        />
      </FormSection>
      <FormSection title="Contactos do organizador">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact_whatsapp" label="WhatsApp" error={errors.contact_whatsapp?.message}>
            <Input id="contact_whatsapp" type="tel" inputMode="tel" {...form.register("contact_whatsapp")} />
          </FormField>
          <FormField id="contact_phone" label="Telefone" error={errors.contact_phone?.message}>
            <Input id="contact_phone" type="tel" inputMode="tel" {...form.register("contact_phone")} />
          </FormField>
        </div>
      </FormSection>
      <div className="sticky bottom-20 z-10 flex flex-wrap justify-end gap-2 md:bottom-4">
        {event ? (
          <Button
            type="button"
            variant="destructive"
            className="bg-card shadow"
            disabled={pending}
            onClick={() =>
              confirm("Eliminar este evento?") &&
              startTransition(async () => {
                const res = await deleteEvent(event.id);
                if (res.ok) {
                  toast.success("Evento eliminado.");
                  router.push("/dashboard/eventos");
                } else toast.error(res.error);
              })
            }
          >
            <Trash2 /> Eliminar
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : event ? "Guardar alterações" : "Submeter para aprovação"}
        </Button>
      </div>
    </form>
  );
}
