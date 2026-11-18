import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, HandHelping, MessageCircle, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { HelpStatusBadge, HelpTypeBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listGroups } from "@/services/messaging";
import { listHelpRequests } from "@/services/help";

export const metadata: Metadata = {
  title: "Comunidade",
  description: "Chat geral, grupos temáticos, mensagens privadas e ajuda comunitária entre os habitantes da Ilha de Inhaca.",
  alternates: { canonical: "/comunidade" },
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [groups, help] = await Promise.all([listGroups(supabase, user?.id), listHelpRequests(supabase, { status: "open" })]);

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader
        eyebrow="Comunidade"
        title="Ligados pela ilha"
        description="Converse com habitantes e visitantes, junte-se a grupos e ajude quem precisa."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/comunidade/chat" className="gradient-ocean group rounded-2xl p-5 text-white shadow-sm">
          <Globe className="size-7 text-sand" />
          <h2 className="mt-3 text-lg font-bold">Chat geral</h2>
          <p className="mt-1 text-sm text-white/75">A conversa aberta de toda a ilha, em tempo real.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sand">
            Entrar no chat <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
        <Link href="/comunidade/mensagens" className="group rounded-2xl border bg-card p-5 shadow-sm hover:border-turquoise">
          <MessageCircle className="size-7 text-turquoise" />
          <h2 className="mt-3 text-lg font-bold text-ocean">Mensagens privadas</h2>
          <p className="mt-1 text-sm text-muted-foreground">As suas conversas com outros membros e prestadores.</p>
        </Link>
        <Link href="/comunidade/ajuda" className="group rounded-2xl border bg-sand-light p-5 shadow-sm hover:border-sand">
          <HandHelping className="size-7 text-ocean" />
          <h2 className="mt-3 text-lg font-bold text-ocean">Ajuda comunitária</h2>
          <p className="mt-1 text-sm text-ocean/75">Peça ou ofereça transporte, produtos, serviços e apoio.</p>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-ocean">
          <Users className="size-5 text-turquoise" /> Grupos temáticos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/comunidade/grupos/${g.slug}`} className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-turquoise-light text-ocean">
                <DynamicIcon name={g.icon} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ocean">{g.name}</span>
                  {g.is_member ? <span className="rounded-full bg-turquoise px-2 py-0.5 text-[10px] font-bold text-white">MEMBRO</span> : null}
                </span>
                {g.description ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{g.description}</span> : null}
                <span className="mt-1 block text-xs text-muted-foreground">{g.members_count} membros</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ocean">
            <HandHelping className="size-5 text-turquoise" /> Pedidos de ajuda recentes
          </h2>
          <Button asChild size="sm">
            <Link href="/comunidade/ajuda?novo=1">
              <Plus /> Pedir ajuda
            </Link>
          </Button>
        </div>
        {help.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sem pedidos em aberto.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {help.items.slice(0, 6).map((h) => (
              <li key={h.id}>
                <Link href={`/comunidade/ajuda/${h.id}`} className="block rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
                  <div className="flex items-center gap-2">
                    <HelpTypeBadge type={h.type} />
                    <HelpStatusBadge status={h.status} />
                  </div>
                  <p className="mt-2 font-semibold text-ocean">{h.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {h.author?.full_name} · <RelativeTime value={h.created_at} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
