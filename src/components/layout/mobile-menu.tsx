"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  CalendarDays,
  Compass,
  Home,
  LayoutDashboard,
  Map,
  Menu,
  MessagesSquare,
  Newspaper,
  Search,
  Shield,
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";
import { isActivePath } from "./desktop-nav";
import { Logo } from "./logo";

const icons: Record<string, typeof Home> = {
  "/": Home,
  "/descobrir": Compass,
  "/mapa": Map,
  "/feed": Newspaper,
  "/servicos": Briefcase,
  "/agenda": CalendarDays,
  "/mercado": ShoppingBasket,
  "/comunidade": MessagesSquare,
};

export function MobileMenu({
  items,
  user,
}: {
  items: { href: string; label: string }[];
  user: { roles: AppRole[]; name: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle asChild>
            <div onClick={() => setOpen(false)}>
              <Logo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Menu" className="flex flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = icons[item.href] ?? Home;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground/85 hover:bg-muted",
                  active && "bg-turquoise-light text-ocean",
                )}
              >
                <Icon className="size-5 text-turquoise" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/pesquisa"
            onClick={() => setOpen(false)}
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground/85 hover:bg-muted"
          >
            <Search className="size-5 text-turquoise" aria-hidden />
            Pesquisar
          </Link>
          <div className="my-2 border-t" />
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium hover:bg-muted"
              >
                <LayoutDashboard className="size-5 text-turquoise" aria-hidden />
                A minha área
              </Link>
              {canAccessAdmin(user.roles) ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium hover:bg-muted"
                >
                  <Shield className="size-5 text-turquoise" aria-hidden />
                  Administração
                </Link>
              ) : null}
            </>
          ) : (
            <div className="grid gap-2 p-1">
              <Button asChild size="lg" onClick={() => setOpen(false)}>
                <Link href="/registar">Criar conta</Link>
              </Button>
              <Button asChild size="lg" variant="outline" onClick={() => setOpen(false)}>
                <Link href="/entrar">Entrar</Link>
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
