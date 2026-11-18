import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, MapPin } from "lucide-react";
import { ContactButtons } from "@/components/shared/contact-buttons";
import { HelpStatusBadge, HelpTypeBadge } from "@/components/shared/status-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReportDialog } from "@/components/shared/report-dialog";
import { MessageUserButton } from "@/components/shared/message-user-button";
import { HelpRequestActions } from "@/components/community/help-request-actions";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getHelpRequest } from "@/services/help";
import { truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/comunidade/ajuda/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return { title: "Pedido de ajuda" };
  const h = await getHelpRequest(await createClient(), id);
  return h ? { title: h.title, description: truncate(h.description, 160) } : { title: "Pedido não encontrado" };
}

export default async function HelpRequestPage({ params }: PageProps<"/comunidade/ajuda/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const h = await getHelpRequest(supabase, id);
  if (!h) notFound();
  const isAuthor = user?.id === h.author_id;
  const canManage = isAuthor || (user && isModerator(user.roles));

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Link href="/comunidade/ajuda" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ocean">
        <ArrowLeft className="size-4" /> Ajuda comunitária
      </Link>
      <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <HelpTypeBadge type={h.type} />
          <HelpStatusBadge status={h.status} />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ocean sm:text-3xl">{h.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <UserAvatar name={h.author?.full_name} src={h.author?.avatar_url} size="sm" />
          <Link href={`/perfil/${h.author?.username ?? ""}`} className="font-medium text-ocean hover:underline">
            {h.author?.full_name}
          </Link>
          · <RelativeTime value={h.created_at} />
        </div>
        {h.location ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 text-turquoise" /> {h.location}
          </p>
        ) : null}
        <p className="mt-5 leading-relaxed whitespace-pre-line">{h.description}</p>
        {!isAuthor ? (
          <div className="mt-6 space-y-2 border-t pt-5">
            <h2 className="font-semibold text-ocean">Pode ajudar? Entre em contacto</h2>
            <ContactButtons phone={h.contact_phone} whatsapp={h.contact_whatsapp} message={`Olá! Vi o seu pedido "${h.title}" no INHACA CONNECT.`} />
            <MessageUserButton userId={h.author_id} isLoggedIn={Boolean(user)} />
          </div>
        ) : null}
        {canManage ? (
          <div className="mt-6 border-t pt-5">
            <HelpRequestActions id={h.id} status={h.status} />
          </div>
        ) : null}
        {user && !isAuthor ? (
          <div className="mt-4">
            <ReportDialog targetType="help_request" targetId={h.id} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
