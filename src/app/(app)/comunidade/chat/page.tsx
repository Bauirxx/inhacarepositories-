import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getGeneralConversationId, listMessages } from "@/services/messaging";

export const metadata: Metadata = { title: "Chat geral", robots: { index: false } };

export default async function GeneralChatPage() {
  const user = await requireUser("/comunidade/chat");
  const supabase = await createClient();
  const conversationId = await getGeneralConversationId(supabase);
  if (!conversationId) notFound();
  const { items, hasMore } = await listMessages(supabase, conversationId);
  return (
    <ChatRoom
      conversationId={conversationId}
      title="Chat geral da ilha"
      subtitle="Aberto a todos os membros da comunidade"
      backHref="/comunidade"
      initialMessages={items}
      initialHasMore={hasMore}
      me={{ id: user.id, username: user.profile.username, full_name: user.profile.full_name, avatar_url: user.profile.avatar_url }}
      isStaff={isModerator(user.roles)}
    />
  );
}
