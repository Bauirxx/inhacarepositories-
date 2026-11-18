"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Bookmark,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Shield,
  ShoppingBasket,
  Store,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { signOut } from "@/features/authentication/actions";
import { canAccessAdmin } from "@/lib/permissions/roles";
import type { AppRole } from "@/types";

export function UserMenu({
  user,
}: {
  user: { id: string; name: string; username: string; avatar: string | null; roles: AppRole[] };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Menu da conta"
      >
        <UserAvatar name={user.name} src={user.avatar} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">@{user.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> A minha área
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/perfil/${user.username}`}>
            <User /> Perfil público
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/comunidade/mensagens">
            <MessageCircle /> Mensagens
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/guardados">
            <Bookmark /> Guardados
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/negocios">
            <Store /> Os meus negócios
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/produtos">
            <ShoppingBasket /> Os meus produtos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/eventos">
            <CalendarDays /> Os meus eventos
          </Link>
        </DropdownMenuItem>
        {canAccessAdmin(user.roles) ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield /> Administração
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            startTransition(() => signOut());
          }}
          variant="destructive"
        >
          <LogOut /> {pending ? "A terminar…" : "Terminar sessão"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
