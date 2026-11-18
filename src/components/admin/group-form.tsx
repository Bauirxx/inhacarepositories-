"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { ICON_NAMES } from "@/components/shared/dynamic-icon";
import { saveGroup } from "@/features/admin/actions";
import { groupSchema, type GroupInput } from "@/lib/validations/community";
import { slugify } from "@/lib/utils";
import type { Group } from "@/types";

export function GroupFormDialog({ group }: { group?: Group }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<GroupInput>({
    resolver: zodResolver(groupSchema) as never,
    defaultValues: {
      name: group?.name ?? "",
      slug: group?.slug ?? "",
      description: group?.description ?? "",
      topic: group?.topic ?? "",
      icon: group?.icon ?? "users",
      is_default: group?.is_default ?? false,
    },
  });
  const { errors } = form.formState;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {group ? (
          <Button size="sm" variant="outline">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <Plus /> Novo grupo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Editar grupo" : "Novo grupo"}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              const res = await saveGroup(values, group?.id);
              if (res.ok) {
                toast.success("Grupo guardado.");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }),
          )}
        >
          <FormField id="g-name" label="Nome" error={errors.name?.message}>
            <Input
              id="g-name"
              {...form.register("name", {
                onBlur: (e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value)),
              })}
            />
          </FormField>
          <FormField id="g-slug" label="Endereço (slug)" error={errors.slug?.message}>
            <Input id="g-slug" {...form.register("slug")} />
          </FormField>
          <FormField id="g-desc" label="Descrição" error={errors.description?.message}>
            <Textarea id="g-desc" rows={3} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="g-topic" label="Tema">
              <Input id="g-topic" {...form.register("topic")} />
            </FormField>
            <FormField id="g-icon" label="Ícone">
              <select id="g-icon" {...form.register("icon")} className="h-11 rounded-xl border bg-card px-3">
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            Grupo oficial (aparece primeiro)
            <Switch checked={form.watch("is_default")} onCheckedChange={(v) => form.setValue("is_default", v)} />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
