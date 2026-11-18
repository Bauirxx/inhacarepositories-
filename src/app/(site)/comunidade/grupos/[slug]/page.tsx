import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { JoinGroupButton } from "@/components/chat/join-group-button";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGroupBySlug } from "@/services/messaging";

export async function generateMetadata({ params }: PageProps<"/comunidade/grupos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGroupBySlug(await createClient(), slug);
  return g ? { title: `Grupo ${g.name}`, description: g.description ?? undefined } : { title: "Grupo não encontrado" };
}

export default async function GroupPage({ params }: PageProps<"/comunidade/grupos/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const group = await getGroupBySlug(supabase, slug, user?.id);
  if (!group) notFound();

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Link href="/comunidade" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ocean">
        <ArrowLeft className="size-4" /> Comunidade
      </Link>
      <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-turquoise-light text-ocean">
          <DynamicIcon name={group.icon} className="size-8" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-ocean">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{group.members_count} membros</p>
        {group.description ? <p className="mt-4 leading-relaxed">{group.description}</p> : null}
        <div className="mt-6">
          <JoinGroupButton
            groupId={group.id}
            conversationId={group.conversation_id}
            isMember={Boolean(group.is_member)}
            isLoggedIn={Boolean(user)}
            slug={group.slug}
          />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          As conversas do grupo são visíveis apenas para os membros. Respeite as regras da comunidade; conteúdos impróprios
          podem ser denunciados e removidos.
        </p>
      </div>
    </div>
  );
}
