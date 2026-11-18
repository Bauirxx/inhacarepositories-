"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { updateProfile } from "@/features/profiles/actions";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import type { Profile } from "@/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: {
      full_name: profile.full_name,
      username: profile.username,
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      whatsapp: profile.whatsapp ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      is_resident: profile.is_resident,
      avatar_url: profile.avatar_url ?? "",
    },
  });
  const { errors } = form.formState;
  const avatar = form.watch("avatar_url");

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await updateProfile(values);
          if (res.ok) {
            toast.success("Perfil atualizado.");
            router.refresh();
          } else {
            if (res.fieldErrors?.username) form.setError("username", { message: res.fieldErrors.username[0] });
            toast.error(res.error);
          }
        }),
      )}
    >
      <FormSection title="Fotografia de perfil">
        <div className="max-w-40">
          <ImageUploader
            bucket="avatars"
            folder={profile.id}
            value={avatar ? [avatar] : []}
            onChange={(urls) => form.setValue("avatar_url", urls[0] ?? "", { shouldDirty: true })}
            aspect="square"
            label="Escolher"
          />
        </div>
      </FormSection>
      <FormSection title="Informação pública">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="full_name" label="Nome" error={errors.full_name?.message} required>
            <Input id="full_name" {...form.register("full_name")} />
          </FormField>
          <FormField id="username" label="Nome de utilizador" error={errors.username?.message} required>
            <Input id="username" autoCapitalize="none" {...form.register("username")} />
          </FormField>
        </div>
        <FormField id="bio" label="Sobre mim" error={errors.bio?.message}>
          <Textarea id="bio" rows={4} maxLength={500} {...form.register("bio")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="location" label="Localidade" error={errors.location?.message}>
            <Input id="location" placeholder="Ex.: Inhaca Sede" {...form.register("location")} />
          </FormField>
          <FormField id="website" label="Website" error={errors.website?.message}>
            <Input id="website" type="url" inputMode="url" {...form.register("website")} />
          </FormField>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3">
          <span>
            <span className="block text-sm font-medium">Sou habitante da Ilha de Inhaca</span>
            <span className="text-xs text-muted-foreground">Mostra o selo de habitante no seu perfil.</span>
          </span>
          <Switch checked={form.watch("is_resident")} onCheckedChange={(v) => form.setValue("is_resident", v, { shouldDirty: true })} />
        </label>
      </FormSection>
      <FormSection title="Contactos" description="Opcional. Ficam visíveis apenas se os preencher.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
            <Input id="whatsapp" type="tel" inputMode="tel" placeholder="84 123 4567" {...form.register("whatsapp")} />
          </FormField>
          <FormField id="phone" label="Telefone" error={errors.phone?.message}>
            <Input id="phone" type="tel" inputMode="tel" {...form.register("phone")} />
          </FormField>
        </div>
      </FormSection>
      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : "Guardar perfil"}
        </Button>
      </div>
    </form>
  );
}
