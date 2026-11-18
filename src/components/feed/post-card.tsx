"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bookmark,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RelativeTime } from "@/components/shared/relative-time";
import { ReportDialog } from "@/components/shared/report-dialog";
import { postCategoryLabels } from "@/config/site";
import { deletePost, registerShare, toggleLike, toggleSave } from "@/features/posts/actions";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";
import { PostMediaGrid } from "./post-media";

export interface Viewer {
  id: string;
  isStaff: boolean;
}

const COLLAPSE_AT = 420;

export function PostCard({
  post,
  viewer,
  onDeleted,
  showFull = false,
}: {
  post: Post;
  viewer: Viewer | null;
  onDeleted?: (id: string) => void;
  showFull?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(Boolean(post.liked_by_me));
  const [likes, setLikes] = useState(post.likes_count);
  const [saved, setSaved] = useState(Boolean(post.saved_by_me));
  const [expanded, setExpanded] = useState(showFull);
  const [reportOpen, setReportOpen] = useState(false);
  const [, startTransition] = useTransition();

  const requireAuth = () => {
    if (!viewer) {
      toast("Inicie sessão para interagir.", {
        action: { label: "Entrar", onClick: () => router.push(`/entrar?next=/feed/${post.id}`) },
      });
      return false;
    }
    return true;
  };

  const onLike = () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const res = await toggleLike(post.id, next);
      if (!res.ok) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
        toast.error(res.error);
      }
    });
  };

  const onSave = () => {
    if (!requireAuth()) return;
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSave(post.id, next);
      if (!res.ok) {
        setSaved(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? "Publicação guardada." : "Removida dos guardados.");
      }
    });
  };

  const onShare = async () => {
    const url = `${window.location.origin}/feed/${post.id}`;
    const title = `${post.author?.full_name ?? "Publicação"} · INHACA CONNECT`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: post.content.slice(0, 120), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Ligação copiada.");
      }
      registerShare(post.id);
    } catch {
      /* partilha cancelada */
    }
  };

  const onDelete = () => {
    if (!confirm("Eliminar esta publicação? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const res = await deletePost(post.id);
      if (res.ok) {
        toast.success("Publicação eliminada.");
        onDeleted?.(post.id);
        if (showFull) router.push("/feed");
      } else toast.error(res.error);
    });
  };

  const canDelete = viewer && (viewer.id === post.author_id || viewer.isStaff);
  const long = post.content.length > COLLAPSE_AT;
  const text = !expanded && long ? post.content.slice(0, COLLAPSE_AT).replace(/\s+\S*$/, "") + "…" : post.content;

  return (
    <article className="rounded-2xl border bg-card shadow-sm">
      <header className="flex items-start gap-3 p-4 pb-2">
        <Link href={`/perfil/${post.author?.username ?? ""}`} className="shrink-0">
          <UserAvatar name={post.author?.full_name} src={post.author?.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/perfil/${post.author?.username ?? ""}`} className="truncate font-semibold text-ocean hover:underline">
              {post.author?.full_name ?? "Utilizador"}
            </Link>
            {post.is_pinned ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-coral">
                <Pin className="size-3" aria-hidden /> Fixada
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <Link href={`/feed/${post.id}`} className="hover:underline">
              <RelativeTime value={post.created_at} />
            </Link>
            {post.location ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3" aria-hidden /> {post.location}
              </span>
            ) : null}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {postCategoryLabels[post.category]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Mais opções" className="-mr-2 shrink-0">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onShare}>
              <Share2 /> Partilhar
            </DropdownMenuItem>
            {viewer && viewer.id !== post.author_id ? (
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                <Flag /> Denunciar
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> Eliminar
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.content ? (
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-line">{text}</p>
          {long ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-semibold text-turquoise">
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          ) : null}
        </div>
      ) : null}

      {post.media?.length ? (
        <div className="px-2 pb-2 sm:px-4">
          <PostMediaGrid media={post.media} />
        </div>
      ) : null}

      <footer className="flex items-center gap-1 border-t px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          aria-pressed={liked}
          className={cn("h-10 flex-1", liked && "text-coral")}
        >
          <Heart className={cn(liked && "fill-coral")} /> {likes > 0 ? likes : ""} <span className="sr-only sm:not-sr-only">Gosto</span>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-10 flex-1">
          <Link href={`/feed/${post.id}#comentarios`}>
            <MessageCircle /> {post.comments_count > 0 ? post.comments_count : ""}
            <span className="sr-only sm:not-sr-only">Comentar</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onShare} className="h-10 flex-1">
          <Share2 /> <span className="sr-only sm:not-sr-only">Partilhar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          aria-pressed={saved}
          className={cn("h-10 flex-1", saved && "text-turquoise")}
        >
          <Bookmark className={cn(saved && "fill-turquoise")} /> <span className="sr-only sm:not-sr-only">Guardar</span>
        </Button>
      </footer>
      {viewer ? (
        <ReportDialog targetType="post" targetId={post.id} open={reportOpen} onOpenChange={setReportOpen} />
      ) : null}
    </article>
  );
}
