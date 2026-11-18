import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/chat/conversation-list";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyConversations } from "@/services/messaging";

export const metadata: Metadata = { title: "Mensagens", robots: { index: false } };

export default async function InboxPage() {
  const user = await requireUser("/comunidade/mensagens");
  const conversations = await listMyConversations(await createClient());
  return (
    <div className="container-page max-w-3xl py-6 pb-24 sm:py-10">
      <PageHeader
        title="Mensagens"
        description="Conversas privadas, grupos e o chat geral da ilha."
        actions={
          <Button asChild variant="outline">
            <Link href="/comunidade">
              <Users /> Grupos
            </Link>
          </Button>
        }
      />
      <ConversationList initial={conversations} meId={user.id} />
    </div>
  );
}
