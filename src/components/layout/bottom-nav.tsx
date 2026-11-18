"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Map, MessagesSquare, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActivePath } from "./desktop-nav";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/servicos", label: "Serviços", icon: Briefcase },
  { href: "/comunidade", label: "Comunidade", icon: MessagesSquare },
];

/** Barra de navegação inferior (apenas mobile/tablet pequeno). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação rápida"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-ocean",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-turquoise-light",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-turquoise")} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
