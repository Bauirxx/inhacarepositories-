import type { Metadata } from "next";
import Link from "next/link";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions/roles";
import { getAdminStats } from "@/services/admin";
import { roleLabels } from "@/config/site";

export const metadata: Metadata = { title: { default: "Administração", template: "%s · Administração" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff("/admin");
  const stats = await getAdminStats(await createClient());
  const badges = {
    businesses: stats?.businesses_pending ?? 0,
    events: stats?.events_pending ?? 0,
    reports: stats?.reports_open ?? 0,
  };
  const admin = isAdmin(user.roles);
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar isAdmin={admin} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <AdminMobileNav isAdmin={admin} badges={badges} />
          <Link href="/admin" className="font-bold text-ocean lg:hidden">
            Administração
          </Link>
          <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
            {user.profile.full_name} · {admin ? roleLabels.admin : roleLabels.moderator}
          </span>
          <UserMenu
            user={{
              id: user.id,
              name: user.profile.full_name,
              username: user.profile.username,
              avatar: user.profile.avatar_url,
              roles: user.roles,
            }}
          />
        </header>
        <main id="conteudo" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
