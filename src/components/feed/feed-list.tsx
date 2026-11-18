"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { loadMorePosts } from "@/features/posts/actions";
import type { Post, PostCategory } from "@/types";
import { PostCard, type Viewer } from "./post-card";
import { PostComposer } from "./post-composer";

export function FeedList({
  initialPosts,
  initialCursor,
  category,
  authorId,
  viewer,
  composerUser,
}: {
  initialPosts: Post[];
  initialCursor: string | null;
  category?: PostCategory | null;
  authorId?: string;
  viewer: Viewer | null;
  composerUser?: { id: string; name: string; avatar: string | null } | null;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, startLoading] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  // Repõe o estado quando o servidor envia uma nova lista (ex.: mudança de filtro).
  const [prevInitial, setPrevInitial] = useState(initialPosts);
  if (prevInitial !== initialPosts) {
    setPrevInitial(initialPosts);
    setPosts(initialPosts);
    setCursor(initialCursor);
  }

  const loadMore = useCallback(() => {
    if (!cursor || loading) return;
    startLoading(async () => {
      const res = await loadMorePosts({ category, before: cursor, authorId });
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !ids.has(p.id))];
      });
      setCursor(res.nextCursor);
    });
  }, [cursor, loading, category, authorId]);

  // Carregamento progressivo ao aproximar do fim da lista.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "600px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return (
    <div className="space-y-4">
      {composerUser ? <PostComposer user={composerUser} onCreated={() => router.refresh()} /> : null}
      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Ainda não há publicações"
          description="Seja o primeiro a partilhar o que acontece na ilha."
        />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewer={viewer}
            onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))}
          />
        ))
      )}
      <div ref={sentinel} />
      {cursor ? (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {loading ? "A carregar…" : "Carregar mais"}
          </Button>
        </div>
      ) : posts.length > 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Chegou ao fim do feed.</p>
      ) : null}
    </div>
  );
}
