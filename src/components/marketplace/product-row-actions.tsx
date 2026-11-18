"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProduct, setProductStatus } from "@/features/products/actions";
import type { ProductStatus } from "@/types";

export function ProductRowActions({ id, status }: { id: string; status: ProductStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (s: "active" | "sold_out" | "archived") =>
    startTransition(async () => {
      const res = await setProductStatus(id, s);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Ações">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/produtos/${id}`}>
            <Pencil /> Editar
          </Link>
        </DropdownMenuItem>
        {status !== "suspended" ? (
          <>
            {status !== "active" ? <DropdownMenuItem onSelect={() => change("active")}>Marcar disponível</DropdownMenuItem> : null}
            {status !== "sold_out" ? <DropdownMenuItem onSelect={() => change("sold_out")}>Marcar esgotado</DropdownMenuItem> : null}
            {status !== "archived" ? <DropdownMenuItem onSelect={() => change("archived")}>Arquivar</DropdownMenuItem> : null}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() =>
            confirm("Eliminar este produto?") &&
            startTransition(async () => {
              const res = await deleteProduct(id);
              if (res.ok) {
                toast.success("Produto eliminado.");
                router.refresh();
              } else toast.error(res.error);
            })
          }
        >
          <Trash2 /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
