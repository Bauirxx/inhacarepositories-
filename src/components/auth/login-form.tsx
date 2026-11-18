"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { resendConfirmation, signIn } from "@/features/authentication/actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await signIn(values);
      if (res.ok) {
        router.replace(res.data.redirectTo);
        router.refresh();
      } else {
        setUnconfirmed(res.error.includes("Confirme"));
        toast.error(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register("email")} aria-invalid={!!errors.email} />
      </FormField>
      <FormField id="password" label="Palavra-passe" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            {...form.register("password")}
            aria-invalid={!!errors.password}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
            aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </FormField>
      <div className="flex justify-end">
        <Link href="/recuperar" className="text-sm font-medium text-turquoise hover:underline">
          Esqueceu a palavra-passe?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "A entrar…" : "Entrar"}
      </Button>
      {unconfirmed ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              const res = await resendConfirmation(form.getValues("email"));
              if (res.ok) toast.success("Email de confirmação reenviado.");
              else toast.error(res.error);
            })
          }
        >
          Reenviar email de confirmação
        </Button>
      ) : null}
    </form>
  );
}
