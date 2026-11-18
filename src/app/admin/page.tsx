import Link from "next/link";
import {
  CalendarDays,
  Flag,
  HandHelping,
  MessageCircle,
  Newspaper,
  ShoppingBasket,
  Store,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ContentStatusBadge } from "@/components/shared/status-badge";
import { ModerationButtons } from "@/components/admin/moderation-buttons";
import { createClient } from "@/lib/supabase/server";
import { getAdminStats } from "@/services/admin";
import { listBusinessesForAdmin } from "@/services/businesses";
import { listEventsForAdmin } from "@/services/events";
import { formatDateTime } from "@/lib/utils";

export default async function AdminHome() {
  const supabase = await createClient();
  const [stats, pendingBusinesses, pendingEvents] = await Promise.all([
    getAdminStats(supabase),
    listBusinessesForAdmin(supabase, { status: "pending" }),
    listEventsForAdmin(supabase, { status: "pending" }),
  ]);
  const s = stats;
  const cards = s
    ? [
        { label: "Utilizadores", value: s.users_total, sub: `+${s.users_last_30d} em 30 dias`, icon: Users, href: "/admin/utilizadores" },
        { label: "Estabelecimentos", value: s.businesses_approved, sub: `${s.businesses_pending} pendentes`, icon: Store, href: "/admin/negocios" },
        { label: "Publicações", value: s.posts_total, sub: `+${s.posts_last_7d} em 7 dias`, icon: Newspaper, href: "/admin/publicacoes" },
        { label: "Eventos futuros", value: s.events_upcoming, sub: `${s.events_pending} pendentes`, icon: CalendarDays, href: "/admin/eventos" },
        { label: "Produtos ativos", value: s.products_active, sub: `${s.products_total} no total`, icon: ShoppingBasket, href: "/admin/produtos" },
        { label: "Denúncias abertas", value: s.reports_open, sub: "a aguardar moderação", icon: Flag, href: "/admin/denuncias" },
        { label: "Mensagens", value: s.messages_last_7d, sub: "nos últimos 7 dias", icon: MessageCircle, href: "/admin/comunidade" },
        { label: "Pedidos de ajuda", value: s.help_requests_open, sub: "em aberto", icon: HandHelping, href: "/admin/comunidade" },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Indicadores gerais" description="Visão geral da atividade da plataforma." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-turquoise" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ocean">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ocean">Estabelecimentos por aprovar</h2>
            <Link href="/admin/negocios" className="text-sm font-medium text-turquoise">
              Ver todos
            </Link>
          </div>
          {pendingBusinesses.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nada pendente. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y">
              {pendingBusinesses.items.slice(0, 6).map((b) => (
                <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/servicos/${b.slug}`} className="font-semibold hover:text-turquoise">
                      {b.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {b.category?.name} · {b.owner?.full_name} · {formatDateTime(b.created_at)}
                      {b.latitude == null ? " · sem localização" : ""}
                    </p>
                  </div>
                  <ModerationButtons kind="business" id={b.id} status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ocean">Eventos por aprovar</h2>
            <Link href="/admin/eventos" className="text-sm font-medium text-turquoise">
              Ver todos
            </Link>
          </div>
          {pendingEvents.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nada pendente. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y">
              {pendingEvents.items.slice(0, 6).map((e) => (
                <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/agenda/${e.slug}`} className="font-semibold hover:text-turquoise">
                      {e.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.starts_at)} · {e.organizer?.full_name}
                    </p>
                  </div>
                  <ContentStatusBadge status={e.status} />
                  <ModerationButtons kind="event" id={e.id} status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
