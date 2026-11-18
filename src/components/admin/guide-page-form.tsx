"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField, FormSection } from "@/components/shared/form-field";
import { ImageUploader } from "@/components/shared/image-uploader";
import { ICON_NAMES } from "@/components/shared/dynamic-icon";
import { deleteGuidePage, saveGuidePage } from "@/features/admin/actions";
import { guidePageSchema, type GuidePageInput } from "@/lib/validations/admin";
import { Markdown } from "@/lib/utils/markdown";
import { slugify } from "@/lib/utils";
import type { GuidePage } from "@/types";

export function GuidePageForm({ page, userId }: { page?: GuidePage | null; userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const form = useForm<GuidePageInput>({
    resolver: zodResolver(guidePageSchema) as never,
    defaultValues: {
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      excerpt: page?.excerpt ?? "",
      content: page?.content ?? "",
      cover_url: page?.cover_url ?? "",
      icon: page?.icon ?? "info",
      sort_order: page?.sort_order ?? 0,
      is_published: page?.is_published ?? true,
    },
  });
  const { errors } = form.formState;
  const cover = form.watch("cover_url");

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await saveGuidePage(values, page?.id);
          if (res.ok) {
            toast.success("Página guardada.");
            router.push("/admin/guia");
            router.refresh();
          } else toast.error(res.error);
        }),
      )}
    >
      <FormSection title="Página">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="title" label="Título" error={errors.title?.message} required>
            <Input id="title" {...form.register("title", { onBlur: (e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value)) })} />
          </FormField>
          <FormField id="slug" label="Endereço" hint="/descobrir/endereco" error={errors.slug?.message} required>
            <Input id="slug" {...form.register("slug")} />
          </FormField>
        </div>
        <FormField id="excerpt" label="Resumo" error={errors.excerpt?.message}>
          <Input id="excerpt" maxLength={300} {...form.register("excerpt")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="icon" label="Ícone">
            <select id="icon" {...form.register("icon")} className="h-11 rounded-xl border bg-card px-3">
              {ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="sort_order" label="Ordem">
            <Input id="sort_order" type="number" min={0} {...form.register("sort_order", { valueAsNumber: true })} />
          </FormField>
          <label className="flex items-end justify-between gap-3 pb-2 text-sm font-medium">
            Publicada
            <Switch checked={form.watch("is_published")} onCheckedChange={(v) => form.setValue("is_published", v)} />
          </label>
        </div>
        <FormField id="cover" label="Imagem de capa" hint="Use fotografias reais da Inhaca, com autorização.">
          <ImageUploader
            bucket="post-media"
            folder={userId}
            value={cover ? [cover] : []}
            onChange={(u) => form.setValue("cover_url", u[0] ?? "")}
            aspect="wide"
          />
        </FormField>
      </FormSection>
      <FormSection title="Conteúdo" description="Formato simples: # título, ## subtítulo, - lista, **negrito**, *itálico*, [ligação](/mapa), > nota.">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={preview ? "outline" : "default"} onClick={() => setPreview(false)}>
            Editar
          </Button>
          <Button type="button" size="sm" variant={preview ? "default" : "outline"} onClick={() => setPreview(true)}>
            Pré-visualizar
          </Button>
        </div>
        {preview ? (
          <div className="min-h-64 rounded-xl border bg-background p-4">
            <Markdown source={form.watch("content")} />
          </div>
        ) : (
          <Textarea rows={22} className="font-mono text-sm" {...form.register("content")} aria-label="Conteúdo" />
        )}
        {errors.content ? <p className="text-xs text-destructive">{errors.content.message}</p> : null}
      </FormSection>
      <div className="sticky bottom-4 z-10 flex justify-end gap-2">
        {page ? (
          <Button
            type="button"
            variant="destructive"
            className="bg-card shadow"
            disabled={pending}
            onClick={() =>
              confirm("Eliminar esta página do guia?") &&
              startTransition(async () => {
                const res = await deleteGuidePage(page.id);
                if (res.ok) {
                  toast.success("Página eliminada.");
                  router.push("/admin/guia");
                } else toast.error(res.error);
              })
            }
          >
            <Trash2 /> Eliminar
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? "A guardar…" : "Guardar página"}
        </Button>
      </div>
    </form>
  );
}
