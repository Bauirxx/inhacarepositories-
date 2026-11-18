import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getConversationDetail, listMessages } from "@/services/messaging";

export const metadata: Metadata = { title: "Conversa", robots: { index: false } };

export default async function ConversationPage({ params }: PageProps<"/comunidade/mensagens/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/comunidade/mensagens/${id}`);
  const supabase = await createClient();
  const detail = await getConversationDetail(supabase, id, user.id);
  // RLS: sem acesso, a conversa simplesmente não é devolvida.
  if (!detail) notFound();
  if (detail.conversation.type === "general") redirect("/comunidade/chat");

  const { items, hasMore } = await listMessages(supabase, id);
  const me = { id: user.id, username: user.profile.username, full_name: user.profile.full_name, avatar_url: user.profile.avatar_url };

  if (detail.conversation.type === "group") {
    return (
      <ChatRoom
        conversationId={id}
        title={detail.group?.name ?? detail.conversation.title ?? "Grupo"}
        subtitle={`${detail.group?.members_count ?? detail.members.length} membros`}
        headerLink={detail.group ? `/comunidade/grupos/${detail.group.slug}` : undefined}
        backHref="/comunidade/mensagens"
        initialMessages={items}
        initialHasMore={hasMore}
        me={me}
        isStaff={isModerator(user.roles)}
      />
    );
  }

  const other = detail.otherUser;
  return (
    <ChatRoom
      conversationId={id}
      title={other?.full_name ?? "Conversa"}
      subtitle={other ? `@${other.username}` : undefined}
      avatar={other ? { name: other.full_name, src: other.avatar_url } : null}
      headerLink={other ? `/perfil/${other.username}` : undefined}
      backHref="/comunidade/mensagens"
      initialMessages={items}
      initialHasMore={hasMore}
      me={me}
      otherUser={other}
      isStaff={isModerator(user.roles)}
    />
  );
}
