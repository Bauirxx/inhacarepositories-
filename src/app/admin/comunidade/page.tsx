import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { HelpStatusBadge, HelpTypeBadge } from "@/components/shared/status-badge";
import { ActionButton } from "@/components/admin/toggle-action";
import { GroupFormDialog } from "@/components/admin/group-form";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions/roles";
import { getGeneralConversationId, listGroups, listMessages } from "@/services/messaging";
import { listHelpRequests } from "@/services/help";
import { deleteGroup, deleteMessageAsStaff } from "@/features/admin/actions";
import { deleteHelpRequest, setHelpRequestStatus } from "@/features/community/actions";
import { formatDateTime, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Comunidade" };

export default async function AdminCommunityPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const admin = isAdmin(user?.roles);
  const generalId = await getGeneralConversationId(supabase);
  const [groups, help, general] = await Promise.all([
    listGroups(supabase),
    listHelpRequests(supabase, { status: "all" }),
    generalId ? listMessages(supabase, generalId, null, 25) : Promise.resolve({ items: [], hasMore: false }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Comunidade" description="Grupos temáticos, moderação do chat geral e pedidos de ajuda comunitária." actions={admin ? <GroupFormDialog /> : undefined} />

      <section>
        <h2 className="mb-3 text-lg font-bold text-ocean">Grupos</h2>
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {groups.map((g) => (
            <li key={g.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-turquoise-light text-ocean">
                <DynamicIcon name={g.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/comunidade/grupos/${g.slug}`} className="font-semibold hover:text-turquoise">
                  {g.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {g.members_count} membros{g.is_default ? " · oficial" : ""} · /{g.slug}
                </p>
              </div>
              {admin ? (
                <div className="flex gap-2">
                  <GroupFormDialog group={g} />
                  <ActionButton action={deleteGroup.bind(null, g.id)} variant="destructive" confirmText={`Eliminar o grupo "${g.name}" e todas as mensagens?`} successText="Grupo eliminado.">
                    Eliminar
                  </ActionButton>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ocean">Chat geral — mensagens recentes</h2>
        {general.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem mensagens.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card shadow-sm">
            {[...general.items].reverse().map((m) => (
              <li key={m.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{m.sender?.full_name}</span>{" "}
                  <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                  <p className={m.is_deleted ? "text-muted-foreground italic" : ""}>
                    {m.is_deleted ? "Mensagem apagada" : truncate(m.content || (m.image_url ? "(fotografia)" : ""), 240)}
                  </p>
                </div>
                {!m.is_deleted ? (
                  <ActionButton action={deleteMessageAsStaff.bind(null, m.id)} variant="ghost" confirmText="Apagar esta mensagem?" successText="Mensagem apagada.">
                    Apagar
                  </ActionButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ocean">Pedidos de ajuda</h2>
        <ul className="divide-y rounded-2xl border bg-card shadow-sm">
          {help.items.map((h) => (
            <li key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <HelpTypeBadge type={h.type} />
                  <HelpStatusBadge status={h.status} />
                  <Link href={`/comunidade/ajuda/${h.id}`} className="font-semibold hover:text-turquoise">
                    {h.title}
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  {h.author?.full_name} · {formatDateTime(h.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                {h.status === "open" ? (
                  <ActionButton action={setHelpRequestStatus.bind(null, h.id, "closed")}>Fechar</ActionButton>
                ) : null}
                <ActionButton action={deleteHelpRequest.bind(null, h.id)} variant="destructive" confirmText="Eliminar este pedido?" successText="Eliminado.">
                  Eliminar
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
