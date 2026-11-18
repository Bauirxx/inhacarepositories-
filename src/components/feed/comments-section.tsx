"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CornerDownRight, Flag, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RelativeTime } from "@/components/shared/relative-time";
import { ReportDialog } from "@/components/shared/report-dialog";
import { addComment, deleteComment } from "@/features/posts/actions";
import type { Comment } from "@/types";
import type { Viewer } from "./post-card";

function CommentForm({
  postId,
  parentId,
  onAdded,
  autoFocus,
  placeholder = "Escreva um comentário…",
}: {
  postId: string;
  parentId?: string | null;
  onAdded: (c: Comment) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await addComment({ post_id: postId, parent_id: parentId ?? null, content: text.trim() });
      if (res.ok) {
        onAdded(res.data);
        setText("");
      } else toast.error(res.error);
    });
  };
  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={1}
        maxLength={2000}
        autoFocus={autoFocus}
        className="min-h-11 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
        }}
        aria-label={placeholder}
      />
      <Button size="icon" onClick={submit} disabled={pending || !text.trim()} aria-label="Enviar comentário">
        <Send />
      </Button>
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  viewer,
  onRemove,
  depth = 0,
}: {
  comment: Comment;
  postId: string;
  viewer: Viewer | null;
  onRemove: (id: string) => void;
  depth?: number;
}) {
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [replying, setReplying] = useState(false);
  const [, startTransition] = useTransition();
  const canDelete = viewer && (viewer.id === comment.author_id || viewer.isStaff);

  return (
    <li className="flex gap-2.5">
      <Link href={`/perfil/${comment.author?.username ?? ""}`} className="shrink-0">
        <UserAvatar name={comment.author?.full_name} src={comment.author?.avatar_url} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted px-3.5 py-2.5">
          <Link href={`/perfil/${comment.author?.username ?? ""}`} className="text-sm font-semibold text-ocean hover:underline">
            {comment.author?.full_name ?? "Utilizador"}
          </Link>
          <p className="text-sm break-words whitespace-pre-line">{comment.content}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 px-2 text-xs text-muted-foreground">
          <RelativeTime value={comment.created_at} />
          {viewer && depth === 0 ? (
            <button type="button" className="font-semibold hover:text-ocean" onClick={() => setReplying((v) => !v)}>
              Responder
            </button>
          ) : null}
          {viewer && viewer.id !== comment.author_id ? (
            <ReportDialog
              targetType="comment"
              targetId={comment.id}
              trigger={
                <button type="button" className="inline-flex items-center gap-1 hover:text-ocean">
                  <Flag className="size-3" /> Denunciar
                </button>
              }
            />
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-destructive"
              onClick={() => {
                if (!confirm("Eliminar este comentário?")) return;
                startTransition(async () => {
                  const res = await deleteComment(comment.id);
                  if (res.ok) onRemove(comment.id);
                  else toast.error(res.error);
                });
              }}
            >
              <Trash2 className="size-3" /> Eliminar
            </button>
          ) : null}
        </div>
        {replies.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                postId={postId}
                viewer={viewer}
                depth={depth + 1}
                onRemove={(id) => setReplies((list) => list.filter((x) => x.id !== id))}
              />
            ))}
          </ul>
        ) : null}
        {replying ? (
          <div className="mt-2 flex gap-2">
            <CornerDownRight className="mt-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                autoFocus
                placeholder="Escreva uma resposta…"
                onAdded={(c) => {
                  setReplies((list) => [...list, c]);
                  setReplying(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function CommentsSection({
  postId,
  initialComments,
  viewer,
}: {
  postId: string;
  initialComments: Comment[];
  viewer: Viewer | null;
}) {
  const [comments, setComments] = useState(initialComments);
  return (
    <section id="comentarios" className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-ocean">Comentários</h2>
      {viewer ? (
        <div className="mb-5">
          <CommentForm postId={postId} onAdded={(c) => setComments((list) => [...list, c])} />
        </div>
      ) : (
        <p className="mb-5 rounded-xl bg-muted p-3 text-sm">
          <Link href={`/entrar?next=/feed/${postId}`} className="font-semibold text-turquoise">
            Inicie sessão
          </Link>{" "}
          para comentar.
        </p>
      )}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda sem comentários.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              viewer={viewer}
              onRemove={(id) => setComments((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
