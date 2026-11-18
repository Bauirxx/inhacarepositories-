import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { mainNav } from "@/config/site";
import { Logo } from "./logo";
import { DesktopNav } from "./desktop-nav";
import { MobileMenu } from "./mobile-menu";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";

export async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-3">
        <MobileMenu user={user ? { roles: user.roles, name: user.profile.full_name } : null} items={mainNav} />
        <Logo />
        <DesktopNav items={mainNav} />
        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" aria-label="Pesquisar">
            <Link href="/pesquisa">
              <Search className="size-5" />
            </Link>
          </Button>
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <UserMenu
                user={{
                  id: user.id,
                  name: user.profile.full_name,
                  username: user.profile.username,
                  avatar: user.profile.avatar_url,
                  roles: user.roles,
                }}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex lg:hidden xl:inline-flex">
                <Link href="/entrar">Entrar</Link>
              </Button>
              <Button asChild variant="turquoise" size="sm" className="h-10">
                <Link href="/registar">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
