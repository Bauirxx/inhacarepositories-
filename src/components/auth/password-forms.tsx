"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { requestPasswordReset, updatePassword } from "@/features/authentication/actions";
import {
  forgotPasswordSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type UpdatePasswordInput,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  if (sent) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <MailCheck className="mx-auto size-10 text-turquoise" />
        <p className="mt-3 font-semibold text-ocean">Verifique o seu email</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Se existir uma conta com esse endereço, receberá uma ligação para definir uma nova palavra-passe.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await requestPasswordReset(values);
          if (res.ok) setSent(true);
          else toast.error(res.error);
        }),
      )}
    >
      <FormField id="email" label="Email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "A enviar…" : "Enviar ligação de recuperação"}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });
  const { errors } = form.formState;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await updatePassword(values);
          if (res.ok) {
            toast.success("Palavra-passe atualizada.");
            router.replace("/dashboard");
            router.refresh();
          } else toast.error(res.error);
        }),
      )}
    >
      <FormField id="password" label="Nova palavra-passe" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <FormField id="confirm_password" label="Confirmar palavra-passe" error={errors.confirm_password?.message}>
        <Input id="confirm_password" type="password" autoComplete="new-password" {...form.register("confirm_password")} />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "A guardar…" : "Guardar palavra-passe"}
      </Button>
    </form>
  );
}
