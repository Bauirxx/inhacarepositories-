"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarDays, LayoutDashboard, MessageCircle, ShoppingBasket, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Resumo", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/negocios", label: "Negócios", icon: Store },
  { href: "/dashboard/produtos", label: "Produtos", icon: ShoppingBasket },
  { href: "/dashboard/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/dashboard/guardados", label: "Guardados", icon: Bookmark },
  { href: "/comunidade/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/dashboard/perfil", label: "Perfil", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Área pessoal" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-ocean text-white" : "bg-card text-foreground/80 hover:bg-muted lg:bg-transparent",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
