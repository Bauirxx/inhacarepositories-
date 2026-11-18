"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/shared/form-field";
import { signUp } from "@/features/authentication/actions";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    // O "input" do esquema tem campos com default; o tipo de saída é o usado no formulário.
    resolver: zodResolver(registerSchema) as never,
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      is_resident: false,
      accept_terms: false,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await signUp(values);
      if (!res.ok) {
        if (res.fieldErrors?.username) form.setError("username", { message: res.fieldErrors.username[0] });
        toast.error(res.error);
        return;
      }
      if (res.data.needsConfirmation) {
        router.push(`/verificar-email?email=${encodeURIComponent(values.email)}`);
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField id="full_name" label="Nome completo" error={errors.full_name?.message} required>
        <Input
          id="full_name"
          autoComplete="name"
          {...form.register("full_name", {
            onBlur: (e) => {
              if (!form.getValues("username")) {
                form.setValue("username", slugify(e.target.value).replace(/-/g, "_").slice(0, 30));
              }
            },
          })}
          aria-invalid={!!errors.full_name}
        />
      </FormField>
      <FormField
        id="username"
        label="Nome de utilizador"
        error={errors.username?.message}
        hint="Letras minúsculas, números e _. Será o endereço do seu perfil."
        required
      >
        <Input id="username" autoComplete="username" autoCapitalize="none" {...form.register("username")} aria-invalid={!!errors.username} />
      </FormField>
      <FormField id="email" label="Email" error={errors.email?.message} required>
        <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register("email")} aria-invalid={!!errors.email} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="password" label="Palavra-passe" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={!!errors.password} />
        </FormField>
        <FormField id="confirm_password" label="Confirmar" error={errors.confirm_password?.message} required>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            {...form.register("confirm_password")}
            aria-invalid={!!errors.confirm_password}
          />
        </FormField>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
        <Checkbox
          checked={form.watch("is_resident")}
          onCheckedChange={(v) => form.setValue("is_resident", v === true)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Sou habitante da Ilha de Inhaca</span>
          <span className="block text-xs text-muted-foreground">Dá acesso às funcionalidades de habitante da comunidade.</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox
          checked={form.watch("accept_terms")}
          onCheckedChange={(v) => form.setValue("accept_terms", v === true, { shouldValidate: true })}
          className="mt-0.5"
          aria-invalid={!!errors.accept_terms}
        />
        <span>
          Aceito os{" "}
          <Link href="/sobre#termos" className="font-medium text-turquoise underline" target="_blank">
            termos de utilização e a política de privacidade
          </Link>
          .
        </span>
      </label>
      {errors.accept_terms ? <p className="text-xs font-medium text-destructive">{errors.accept_terms.message}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "A criar conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
