"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="ml-2 hidden items-center gap-0 lg:flex xl:ml-6 xl:gap-0.5">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-2 py-2 text-sm font-medium text-foreground/75 xl:px-3 transition-colors hover:bg-muted hover:text-ocean",
              active && "bg-turquoise-light text-ocean",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
