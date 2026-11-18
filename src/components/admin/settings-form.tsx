"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { saveSiteSettings } from "@/features/admin/actions";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/admin";
import type { SiteSettings } from "@/services/settings";

export function SettingsForm({ settings, userId }: { settings: SiteSettings; userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SiteSettingsInput>({ resolver: zodResolver(siteSettingsSchema), defaultValues: settings });
  const { errors } = form.formState;
  const hero = form.watch("hero_image_url");

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await saveSiteSettings(values);
          if (res.ok) {
            toast.success("Configurações guardadas.");
            router.refresh();
          } else toast.error(res.error);
        }),
      )}
    >
      <FormSection title="Identidade">
        <FormField id="site_name" label="Nome da plataforma" error={errors.site_name?.message}>
          <Input id="site_name" {...form.register("site_name")} />
        </FormField>
        <FormField id="tagline" label="Slogan" error={errors.tagline?.message}>
          <Input id="tagline" {...form.register("tagline")} />
        </FormField>
        <FormField id="announcement" label="Aviso global" hint="Barra de aviso no topo do site. Deixe vazio para ocultar.">
          <Input id="announcement" {...form.register("announcement")} />
        </FormField>
      </FormSection>
      <FormSection title="Página inicial" description="Substitua a imagem ilustrativa por uma fotografia real da Ilha de Inhaca.">
        <FormField id="hero_title" label="Título principal">
          <Input id="hero_title" {...form.register("hero_title")} />
        </FormField>
        <FormField id="hero_subtitle" label="Descrição">
          <Textarea id="hero_subtitle" rows={3} {...form.register("hero_subtitle")} />
        </FormField>
        <FormField id="hero_image" label="Imagem de destaque">
          <ImageUploader
            bucket="post-media"
            folder={userId}
            value={hero && !hero.includes("/placeholders/") ? [hero] : []}
            onChange={(u) => form.setValue("hero_image_url", u[0] ?? "/images/placeholders/hero-inhaca.svg")}
            aspect="wide"
            label="Carregar fotografia"
          />
        </FormField>
      </FormSection>
      <FormSection title="Contactos e redes">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact_email" label="Email" error={errors.contact_email?.message}>
            <Input id="contact_email" type="email" {...form.register("contact_email")} />
          </FormField>
          <FormField id="contact_whatsapp" label="WhatsApp">
            <Input id="contact_whatsapp" type="tel" {...form.register("contact_whatsapp")} />
          </FormField>
          <FormField id="facebook_url" label="Facebook">
            <Input id="facebook_url" {...form.register("facebook_url")} />
          </FormField>
          <FormField id="instagram_url" label="Instagram">
            <Input id="instagram_url" {...form.register("instagram_url")} />
          </FormField>
        </div>
        <FormField id="emergency_info" label="Informação de emergência (rodapé)">
          <Textarea id="emergency_info" rows={3} {...form.register("emergency_info")} />
        </FormField>
      </FormSection>
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : "Guardar configurações"}
        </Button>
      </div>
    </form>
  );
}
