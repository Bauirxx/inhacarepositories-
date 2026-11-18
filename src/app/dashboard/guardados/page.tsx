import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PostCard } from "@/components/feed/post-card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { listSavedPosts } from "@/services/posts";

export const metadata: Metadata = { title: "Publicações guardadas", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUser("/dashboard/guardados");
  const posts = await listSavedPosts(await createClient(), user.id);
  const viewer = { id: user.id, isStaff: isModerator(user.roles) };
  return (
    <div className="max-w-2xl">
      <PageHeader title="Guardados" description="Publicações que guardou para ler mais tarde." />
      {posts.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nada guardado" description="Toque em Guardar numa publicação do feed." />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewer={viewer} />
          ))}
        </div>
      )}
    </div>
  );
}
