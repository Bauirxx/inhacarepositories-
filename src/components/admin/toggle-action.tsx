"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Botão genérico que executa uma Server Action e atualiza a página. */
export function ActionButton({
  action,
  children,
  confirmText,
  successText = "Atualizado.",
  variant = "outline",
  size = "sm",
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  confirmText?: string;
  successText?: string;
  variant?: "outline" | "default" | "destructive" | "turquoise" | "ghost" | "sand";
  size?: "sm" | "xs" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        startTransition(async () => {
          const res = await action();
          if (res.ok) {
            toast.success(successText);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
