"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Ban, Flag, ImagePlus, Loader2, MoreVertical, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReportDialog } from "@/components/shared/report-dialog";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, getSignedUrl, UploadError } from "@/lib/upload";
import {
  deleteMessage,
  fetchMessage,
  loadOlderMessages,
  markConversationRead,
  sendMessage,
} from "@/features/messaging/actions";
import { toggleBlock } from "@/features/profiles/actions";
import { cn, formatDate, formatTime, toIslandTime } from "@/lib/utils";
import type { Message, ProfileSummary } from "@/types";

interface ChatRoomProps {
  conversationId: string;
  title: string;
  subtitle?: string;
  avatar?: { name: string; src: string | null } | null;
  backHref: string;
  initialMessages: Message[];
  initialHasMore: boolean;
  me: ProfileSummary;
  otherUser?: ProfileSummary | null;
  isStaff: boolean;
  headerLink?: string;
}

function dayKey(iso: string) {
  const d = toIslandTime(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Resolve URLs assinados para imagens do bucket privado chat-media. */
function useSignedImage(path: string | null) {
  const isDirect = Boolean(path?.startsWith("http"));
  const [signed, setSigned] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    if (!path || isDirect) return;
    getSignedUrl("chat-media", path, 3600).then((u) => {
      if (active) setSigned({ path, url: u });
    });
    return () => {
      active = false;
    };
  }, [path, isDirect]);
  if (!path) return null;
  if (isDirect) return path;
  return signed?.path === path ? signed.url : null;
}

function ChatImage({ path }: { path: string }) {
  const url = useSignedImage(path);
  if (!url) return <div className="h-48 w-56 animate-pulse rounded-xl bg-black/10" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Fotografia enviada" loading="lazy" className="max-h-72 w-auto max-w-full rounded-xl object-cover" />
    </a>
  );
}

export function ChatRoom({
  conversationId,
  title,
  subtitle,
  avatar,
  backHref,
  initialMessages,
  initialHasMore,
  me,
  otherUser,
  isStaff,
  headerLink,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOlder, startLoadingOlder] = useTransition();
  const [reportId, setReportId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  // Perfis conhecidos (derivados das mensagens) e uma ref para o handler Realtime.
  const profiles = useMemo(() => {
    const map = new Map<string, ProfileSummary>();
    messages.forEach((m) => m.sender && map.set(m.sender_id, m.sender));
    map.set(me.id, me);
    return map;
  }, [messages, me]);
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Marca como lida ao abrir e ao receber mensagens.
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, messages.length]);

  // Subscrição Realtime (as políticas RLS garantem que só participantes recebem eventos).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const raw = payload.new as Message;
          let msg: Message = { ...raw, sender: profilesRef.current.get(raw.sender_id) ?? null };
          if (!msg.sender) msg = (await fetchMessage(raw.id)) ?? msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated, sender: m.sender } : m)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadOlder = () => {
    if (!hasMore || messages.length === 0) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    stickToBottom.current = false;
    startLoadingOlder(async () => {
      const res = await loadOlderMessages(conversationId, messages[0].created_at);
      setMessages((prev) => [...res.items.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasMore(res.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    });
  };

  const send = async (imagePath?: string) => {
    const content = text.trim();
    if (!content && !imagePath) return;
    setSending(true);
    stickToBottom.current = true;
    const res = await sendMessage({ conversation_id: conversationId, content: imagePath ? content || "" : content, image_url: imagePath ?? null });
    setSending(false);
    if (res.ok) {
      setText("");
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
    } else toast.error(res.error);
  };

  const onPickImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, "chat-media", conversationId, { maxSize: 1400 });
      await send(result.path);
    } catch (err) {
      toast.error(err instanceof UploadError ? err.message : "Falha ao enviar a fotografia.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Apagar esta mensagem?")) return;
    const res = await deleteMessage(id);
    if (res.ok) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_deleted: true, content: "", image_url: null } : m)));
    else toast.error(res.error);
  };

  const onBlock = async () => {
    if (!otherUser) return;
    if (!confirm(`Bloquear ${otherUser.full_name}? Deixará de receber mensagens desta pessoa.`)) return;
    const res = await toggleBlock({ user_id: otherUser.id }, true);
    if (res.ok) toast.success("Utilizador bloqueado.");
    else toast.error(res.error);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-4rem-env(safe-area-inset-bottom))] max-w-4xl flex-col border-x bg-card md:h-[calc(100dvh-4rem)]">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 border-b px-2 py-2 sm:px-4">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link href={backHref}>
            <ArrowLeft />
          </Link>
        </Button>
        {avatar ? (
          <UserAvatar name={avatar.name} src={avatar.src} size="sm" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-turquoise-light text-ocean">
            <Users className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {headerLink ? (
            <Link href={headerLink} className="block truncate font-semibold text-ocean hover:underline">
              {title}
            </Link>
          ) : (
            <p className="truncate font-semibold text-ocean">{title}</p>
          )}
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {otherUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Opções da conversa">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/perfil/${otherUser.username}`}>Ver perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onBlock}>
                <Ban /> Bloquear utilizador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain bg-natural px-3 py-4 sm:px-6" aria-live="polite">
        {hasMore ? (
          <div className="mb-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? <Loader2 className="animate-spin" /> : null} Mensagens anteriores
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Ainda não há mensagens. Diga olá! 👋</p>
        ) : null}
        <ul className="space-y-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === me.id;
            const prev = messages[i - 1];
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            const showSender = !mine && (newDay || prev?.sender_id !== m.sender_id);
            const sender = m.sender ?? profiles.get(m.sender_id);
            return (
              <li key={m.id}>
                {newDay ? (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
                      {formatDate(m.created_at, "EEEE, d 'de' MMMM")}
                    </span>
                  </div>
                ) : null}
                <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                  {!mine ? (
                    <div className="w-8 shrink-0">
                      {showSender ? (
                        <Link href={`/perfil/${sender?.username ?? ""}`}>
                          <UserAvatar name={sender?.full_name} src={sender?.avatar_url} size="sm" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  <div className={cn("flex max-w-[82%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                    {showSender ? <span className="mb-0.5 px-1 text-xs font-semibold text-ocean">{sender?.full_name}</span> : null}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[15px] shadow-sm",
                        mine ? "rounded-br-md bg-ocean text-white" : "rounded-bl-md bg-card",
                        m.is_deleted && "bg-muted text-muted-foreground italic shadow-none",
                      )}
                    >
                      {m.is_deleted ? (
                        "Mensagem apagada"
                      ) : (
                        <>
                          {m.image_url ? (
                            <div className="mb-1">
                              <ChatImage path={m.image_url} />
                            </div>
                          ) : null}
                          {m.content ? <p className="break-words whitespace-pre-wrap">{m.content}</p> : null}
                        </>
                      )}
                      <span className={cn("mt-0.5 block text-right text-[10px]", mine ? "text-white/60" : "text-muted-foreground")}>
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  </div>
                  {!m.is_deleted ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-60 group-hover:opacity-100 sm:opacity-0 sm:focus-visible:opacity-100"
                          aria-label="Opções da mensagem"
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={mine ? "end" : "start"}>
                        {mine || isStaff ? (
                          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(m.id)}>
                            <Trash2 /> Apagar
                          </DropdownMenuItem>
                        ) : null}
                        {!mine ? (
                          <DropdownMenuItem onSelect={() => setReportId(m.id)}>
                            <Flag /> Denunciar
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Compositor */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="safe-bottom flex items-end gap-2 border-t bg-card p-2 sm:p-3"
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPickImage(e.target.files)} tabIndex={-1} />
        <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Enviar fotografia">
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        </Button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Enviar" variant="turquoise">
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
      {reportId ? (
        <ReportDialog targetType="message" targetId={reportId} open onOpenChange={(o) => !o && setReportId(null)} />
      ) : null}
    </div>
  );
}
