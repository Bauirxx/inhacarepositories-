import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { PostCard } from "@/components/feed/post-card";
import { CommentsSection } from "@/components/feed/comments-section";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { getPost, listComments } from "@/services/posts";
import { truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/feed/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return { title: "Publicação" };
  const post = await getPost(await createClient(), id);
  if (!post) return { title: "Publicação não encontrada" };
  const description = truncate(post.content || "Publicação no feed da Ilha de Inhaca", 160);
  const image = post.media?.find((m) => m.type === "image")?.url;
  return {
    title: `${post.author?.full_name ?? "Publicação"}: ${truncate(post.content, 60)}`,
    description,
    openGraph: { type: "article", description, images: image ? [image] : undefined },
  };
}

export default async function PostPage({ params }: PageProps<"/feed/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [post, comments] = await Promise.all([getPost(supabase, id, user?.id ?? null), listComments(supabase, id)]);
  if (!post) notFound();
  const viewer = user ? { id: user.id, isStaff: isModerator(user.roles) } : null;

  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <Link href="/feed" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ocean">
        <ArrowLeft className="size-4" /> Voltar ao feed
      </Link>
      {post.is_hidden ? (
        <p className="mb-4 rounded-xl bg-sand-light p-3 text-sm text-amber-900">
          Esta publicação está oculta pela moderação{post.hidden_reason ? `: ${post.hidden_reason}` : ""}.
        </p>
      ) : null}
      <div className="space-y-4">
        <PostCard post={post} viewer={viewer} showFull />
        <CommentsSection postId={post.id} initialComments={comments} viewer={viewer} />
      </div>
    </div>
  );
}
