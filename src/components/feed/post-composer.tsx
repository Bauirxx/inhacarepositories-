"use client";

import { useState, useTransition } from "react";
import { ImagePlus, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ImageUploader } from "@/components/shared/image-uploader";
import { postCategoryLabels } from "@/config/site";
import { createPost } from "@/features/posts/actions";
import type { UploadResult } from "@/lib/upload";
import type { PostCategory } from "@/types";

export function PostComposer({
  user,
  onCreated,
}: {
  user: { id: string; name: string; avatar: string | null };
  onCreated?: (id: string) => void;
}) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("comunidade");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [mediaMeta, setMediaMeta] = useState<Record<string, UploadResult>>({});
  const [showMedia, setShowMedia] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await createPost({
        content: content.trim(),
        category,
        location,
        media: media.map((url) => ({
          url,
          type: mediaMeta[url]?.type ?? "image",
          width: mediaMeta[url]?.width ?? null,
          height: mediaMeta[url]?.height ?? null,
        })),
      });
      if (res.ok) {
        toast.success("Publicado!");
        setContent("");
        setMedia([]);
        setLocation("");
        setShowMedia(false);
        setShowLocation(false);
        onCreated?.(res.data.id);
      } else toast.error(res.error);
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <UserAvatar name={user.name} src={user.avatar} className="hidden sm:flex" />
        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que está a acontecer na ilha?"
            rows={3}
            maxLength={5000}
            className="resize-none border-0 bg-muted/60 p-3 text-base shadow-none focus-visible:ring-2"
            aria-label="Conteúdo da publicação"
          />
          {showMedia ? (
            <ImageUploader
              bucket="post-media"
              folder={user.id}
              value={media}
              onChange={setMedia}
              max={6}
              allowVideo
              aspect="square"
              label="Fotografia ou vídeo"
              onUploaded={(r) => setMediaMeta((m) => ({ ...m, [r.url]: r }))}
            />
          ) : null}
          {showLocation ? (
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local (ex.: Praia da vila, Ponta Torres)"
              maxLength={120}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMedia((v) => !v)}
              className={showMedia ? "text-turquoise" : ""}
            >
              <ImagePlus /> Media
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLocation((v) => !v)}
              className={showLocation ? "text-turquoise" : ""}
            >
              <MapPin /> Local
            </Button>
            <Select value={category} onValueChange={(v) => setCategory(v as PostCategory)}>
              <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(postCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || (!content.trim() && media.length === 0)}
              className="ml-auto"
            >
              <Send /> {pending ? "A publicar…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
