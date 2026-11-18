"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { LocationPicker } from "@/components/map/location-picker";
import { amenityOptions, weekDays } from "@/config/site";
import { saveBusiness } from "@/features/businesses/actions";
import { businessSchema, type BusinessInput } from "@/lib/validations/business";
import type { Business, BusinessCategory, WeekDay } from "@/types";

export function BusinessForm({
  userId,
  categories,
  business,
}: {
  userId: string;
  categories: BusinessCategory[];
  business?: Business | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema) as never,
    defaultValues: {
      name: business?.name ?? "",
      category_id: business?.category_id ?? "",
      short_description: business?.short_description ?? "",
      description: business?.description ?? "",
      phone: business?.phone ?? "",
      whatsapp: business?.whatsapp ?? "",
      email: business?.email ?? "",
      website: business?.website ?? "",
      address: business?.address ?? "",
      latitude: business?.latitude ?? null,
      longitude: business?.longitude ?? null,
      opening_hours: business?.opening_hours ?? {},
      price_info: business?.price_info ?? "",
      amenities: business?.amenities ?? [],
      logo_url: business?.logo_url ?? "",
      cover_url: business?.cover_url ?? "",
      gallery: (business?.media ?? []).map((m) => m.url),
      services: (business?.services ?? []).map((s) => ({
        name: s.name,
        description: s.description ?? "",
        price: s.price ?? "",
      })),
    },
  });
  const { errors } = form.formState;
  const services = useFieldArray({ control: form.control, name: "services" });
  const hours = form.watch("opening_hours") ?? {};
  const amenities = form.watch("amenities") ?? [];

  const setDay = (day: WeekDay, patch: Partial<{ open: string; close: string; closed: boolean }> | null) => {
    const current = form.getValues("opening_hours") ?? {};
    const next = { ...current };
    if (patch === null) delete next[day];
    else next[day] = { open: "08:00", close: "18:00", closed: false, ...(current[day] ?? {}), ...patch };
    form.setValue("opening_hours", next, { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(
    (values) =>
      startTransition(async () => {
        const res = await saveBusiness(values, business?.id);
        if (res.ok) {
          toast.success(
            business ? "Alterações guardadas." : "Estabelecimento submetido! Será publicado após aprovação da administração.",
          );
          router.push(`/dashboard/negocios/${res.data.id}`);
          router.refresh();
        } else toast.error(res.error);
      }),
    () => toast.error("Verifique os campos assinalados."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <FormSection title="Informação principal">
        <FormField id="name" label="Nome comercial" error={errors.name?.message} required>
          <Input id="name" {...form.register("name")} />
        </FormField>
        <FormField id="category_id" label="Categoria" error={errors.category_id?.message} required>
          <select id="category_id" {...form.register("category_id")} className="h-11 rounded-xl border bg-card px-3">
            <option value="">Escolha…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="short_description" label="Descrição curta" hint="Aparece nos cartões e no mapa (máx. 200)." error={errors.short_description?.message}>
          <Input id="short_description" maxLength={200} {...form.register("short_description")} />
        </FormField>
        <FormField id="description" label="Descrição completa" error={errors.description?.message}>
          <Textarea id="description" rows={6} {...form.register("description")} />
        </FormField>
        <FormField id="price_info" label="Preços indicativos" hint="Ex.: Quartos a partir de 3 500 MZN/noite" error={errors.price_info?.message}>
          <Input id="price_info" {...form.register("price_info")} />
        </FormField>
      </FormSection>

      <FormSection title="Imagens" description="Use fotografias reais do seu estabelecimento.">
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <FormField id="logo" label="Logótipo">
            <ImageUploader
              bucket="business-media"
              folder={userId}
              value={form.watch("logo_url") ? [form.watch("logo_url") as string] : []}
              onChange={(u) => form.setValue("logo_url", u[0] ?? "", { shouldDirty: true })}
              aspect="square"
              label="Logótipo"
            />
          </FormField>
          <FormField id="cover" label="Imagem de capa">
            <ImageUploader
              bucket="business-media"
              folder={userId}
              value={form.watch("cover_url") ? [form.watch("cover_url") as string] : []}
              onChange={(u) => form.setValue("cover_url", u[0] ?? "", { shouldDirty: true })}
              label="Capa"
            />
          </FormField>
        </div>
        <FormField id="gallery" label="Galeria (até 12 fotografias)">
          <ImageUploader
            bucket="business-media"
            folder={userId}
            value={form.watch("gallery") ?? []}
            onChange={(u) => form.setValue("gallery", u, { shouldDirty: true })}
            max={12}
            aspect="square"
          />
        </FormField>
      </FormSection>

      <FormSection title="Contactos">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
            <Input id="whatsapp" type="tel" inputMode="tel" placeholder="84 123 4567" {...form.register("whatsapp")} />
          </FormField>
          <FormField id="phone" label="Telefone" error={errors.phone?.message}>
            <Input id="phone" type="tel" inputMode="tel" {...form.register("phone")} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" inputMode="email" {...form.register("email")} />
          </FormField>
          <FormField id="website" label="Website" error={errors.website?.message}>
            <Input id="website" inputMode="url" {...form.register("website")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Localização"
        description="Marque no mapa a localização exata. As coordenadas são verificadas pela administração antes da publicação."
      >
        <FormField id="address" label="Morada / referência" error={errors.address?.message}>
          <Input id="address" placeholder="Ex.: junto ao cais, Inhaca Sede" {...form.register("address")} />
        </FormField>
        <LocationPicker
          latitude={form.watch("latitude")}
          longitude={form.watch("longitude")}
          onChange={({ latitude, longitude }) => {
            form.setValue("latitude", latitude, { shouldDirty: true });
            form.setValue("longitude", longitude, { shouldDirty: true });
          }}
        />
      </FormSection>

      <FormSection title="Horário de funcionamento">
        <div className="divide-y rounded-xl border">
          {weekDays.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-3 p-3">
                <label className="flex w-36 items-center gap-2 text-sm font-medium">
                  <Checkbox checked={Boolean(h)} onCheckedChange={(v) => setDay(d.key, v ? {} : null)} />
                  {d.label}
                </label>
                {h ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={h.closed} onCheckedChange={(v) => setDay(d.key, { closed: v === true })} /> Fechado
                    </label>
                    {!h.closed ? (
                      <>
                        <Input type="time" value={h.open} onChange={(e) => setDay(d.key, { open: e.target.value })} className="w-28" aria-label={`Abertura ${d.label}`} />
                        <span className="text-muted-foreground">–</span>
                        <Input type="time" value={h.close} onChange={(e) => setDay(d.key, { close: e.target.value })} className="w-28" aria-label={`Fecho ${d.label}`} />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Não indicado</span>
                )}
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Serviços disponíveis" description="Liste os serviços com preços indicativos.">
        {services.fields.map((field, i) => (
          <div key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_160px_auto]">
            <div className="grid gap-2">
              <Input placeholder="Nome do serviço" {...form.register(`services.${i}.name`)} aria-label="Nome do serviço" />
              <Input placeholder="Descrição (opcional)" {...form.register(`services.${i}.description`)} aria-label="Descrição do serviço" />
              {errors.services?.[i]?.name ? <p className="text-xs text-destructive">{errors.services[i]?.name?.message}</p> : null}
            </div>
            <Input placeholder="Preço" {...form.register(`services.${i}.price`)} aria-label="Preço" />
            <Button type="button" variant="ghost" size="icon" onClick={() => services.remove(i)} aria-label="Remover serviço">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => services.append({ name: "", description: "", price: "" })} className="w-fit">
          <Plus /> Adicionar serviço
        </Button>
      </FormSection>

      <FormSection title="Comodidades">
        <div className="flex flex-wrap gap-2">
          {amenityOptions.map((a) => {
            const on = amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() =>
                  form.setValue("amenities", on ? amenities.filter((x) => x !== a) : [...amenities, a], { shouldDirty: true })
                }
                aria-pressed={on}
                className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${on ? "border-turquoise bg-turquoise text-white" : "bg-card hover:border-turquoise"}`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </FormSection>

      <div className="sticky bottom-20 z-10 flex justify-end gap-2 md:bottom-4">
        <Button type="button" variant="outline" className="bg-card shadow" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : business ? "Guardar alterações" : "Submeter para aprovação"}
        </Button>
      </div>
    </form>
  );
}
