"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Flag,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessagesSquare,
  Newspaper,
  ScrollText,
  Settings,
  ShoppingBasket,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Indicadores", icon: LayoutDashboard, exact: true },
  { href: "/admin/negocios", label: "Estabelecimentos", icon: Store, badge: "businesses" },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, badge: "events" },
  { href: "/admin/publicacoes", label: "Publicações", icon: Newspaper },
  { href: "/admin/produtos", label: "Produtos", icon: ShoppingBasket },
  { href: "/admin/denuncias", label: "Denúncias", icon: Flag, badge: "reports" },
  { href: "/admin/comunidade", label: "Comunidade", icon: MessagesSquare },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: Users, adminOnly: true },
  { href: "/admin/guia", label: "Guia turístico", icon: BookOpen, adminOnly: true },
  { href: "/admin/publicidade", label: "Publicidade", icon: Megaphone, adminOnly: true },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, adminOnly: true },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
] as const;

export type AdminBadges = { businesses: number; events: number; reports: number };

function NavList({ isAdmin, badges, onNavigate }: { isAdmin: boolean; badges: AdminBadges; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="flex flex-col gap-0.5">
      {items
        .filter((i) => !("adminOnly" in i && i.adminOnly) || isAdmin)
        .map((item) => {
          const Icon = item.icon;
          const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const count = "badge" in item && item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-white",
                active && "bg-sidebar-accent text-white",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {count > 0 ? (
                <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold text-ocean-deep">{count}</span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}

export function AdminSidebar({ isAdmin, badges }: { isAdmin: boolean; badges: AdminBadges }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-4 lg:flex">
      <div className="mb-6 px-1">
        <Logo light />
        <p className="mt-2 text-xs font-semibold tracking-widest text-sand uppercase">Administração</p>
      </div>
      <NavList isAdmin={isAdmin} badges={badges} />
      <div className="mt-auto pt-6">
        <Link href="/" className="text-sm text-sidebar-foreground/60 hover:text-white">
          ← Voltar ao site
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ isAdmin, badges }: { isAdmin: boolean; badges: AdminBadges }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu de administração">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-0 bg-sidebar p-4 text-sidebar-foreground">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-left text-white">Administração</SheetTitle>
        </SheetHeader>
        <NavList isAdmin={isAdmin} badges={badges} onNavigate={() => setOpen(false)} />
        <Link href="/" className="mt-6 block text-sm text-sidebar-foreground/60" onClick={() => setOpen(false)}>
          ← Voltar ao site
        </Link>
      </SheetContent>
    </Sheet>
  );
}
