import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, HandHelping, MessageCircle, Plus, ShoppingBasket, Store, Bell, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ContentStatusBadge, HelpStatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyBusinesses } from "@/services/businesses";
import { listMyProducts } from "@/services/products";
import { listMyEvents } from "@/services/events";
import { listMyHelpRequests } from "@/services/help";
import { getUnreadMessagesCount } from "@/services/messaging";
import { getUnreadNotificationsCount } from "@/services/notifications";
import { roleLabels } from "@/config/site";
import { canAccessAdmin } from "@/lib/permissions/roles";

export const metadata: Metadata = { title: "A minha área", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();
  const [businesses, products, events, help, unreadMessages, unreadNotifications] = await Promise.all([
    listMyBusinesses(supabase, user.id),
    listMyProducts(supabase, user.id),
    listMyEvents(supabase, user.id),
    listMyHelpRequests(supabase, user.id),
    getUnreadMessagesCount(supabase),
    getUnreadNotificationsCount(supabase),
  ]);
  const totalViews = businesses.reduce((s, b) => s + b.views_count, 0) + products.reduce((s, p) => s + p.views_count, 0);

  const stats = [
    { label: "Mensagens por ler", value: unreadMessages, href: "/comunidade/mensagens", icon: MessageCircle },
    { label: "Notificações", value: unreadNotifications, href: "/notificacoes", icon: Bell },
    { label: "Negócios", value: businesses.length, href: "/dashboard/negocios", icon: Store },
    { label: "Visualizações", value: totalViews, href: "/dashboard/negocios", icon: Eye },
  ];

  return (
    <div>
      <PageHeader
        title={`Olá, ${user.profile.full_name.split(" ")[0]}`}
        description={`Papéis: ${user.roles.map((r) => roleLabels[r]).join(", ")}`}
        actions={
          canAccessAdmin(user.roles) ? (
            <Button asChild variant="outline">
              <Link href="/admin">Administração</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
            <Icon className="size-5 text-turquoise" />
            <p className="mt-3 text-2xl font-extrabold text-ocean">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold text-ocean">Ações rápidas</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/feed", label: "Publicar no feed", icon: Plus },
          { href: "/dashboard/negocios/novo", label: "Registar negócio", icon: Store },
          { href: "/dashboard/produtos/novo", label: "Vender produto", icon: ShoppingBasket },
          { href: "/dashboard/eventos/novo", label: "Submeter evento", icon: CalendarDays },
        ].map(({ href, label, icon: Icon }) => (
          <Button key={href} asChild variant="outline" size="lg" className="justify-start bg-card">
            <Link href={href}>
              <Icon className="text-turquoise" /> {label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ocean">Os meus negócios</h2>
            <Link href="/dashboard/negocios" className="text-sm font-medium text-turquoise">
              Gerir
            </Link>
          </div>
          {businesses.length ? (
            <ul className="mt-3 divide-y">
              {businesses.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/dashboard/negocios/${b.id}`} className="truncate font-medium hover:text-turquoise">
                    {b.name}
                  </Link>
                  <ContentStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Ainda não registou nenhum estabelecimento.</p>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ocean">Os meus eventos</h2>
            <Link href="/dashboard/eventos" className="text-sm font-medium text-turquoise">
              Gerir
            </Link>
          </div>
          {events.length ? (
            <ul className="mt-3 divide-y">
              {events.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/dashboard/eventos/${e.id}`} className="truncate font-medium hover:text-turquoise">
                    {e.title}
                  </Link>
                  <ContentStatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Ainda não submeteu eventos.</p>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ocean">Os meus produtos</h2>
            <Link href="/dashboard/produtos" className="text-sm font-medium text-turquoise">
              Gerir
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {products.filter((p) => p.status === "active").length} disponíveis · {products.length} no total
          </p>
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-ocean">
              <HandHelping className="size-4 text-turquoise" /> Os meus pedidos de ajuda
            </h2>
            <Link href="/comunidade/ajuda" className="text-sm font-medium text-turquoise">
              Ver todos
            </Link>
          </div>
          {help.length ? (
            <ul className="mt-3 divide-y">
              {help.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/comunidade/ajuda/${h.id}`} className="truncate font-medium hover:text-turquoise">
                    {h.title}
                  </Link>
                  <HelpStatusBadge status={h.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Sem pedidos publicados.</p>
          )}
        </section>
      </div>
    </div>
  );
}
