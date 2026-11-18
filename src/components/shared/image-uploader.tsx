"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadFile, UploadError, type UploadBucket, type UploadResult } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  bucket: UploadBucket;
  folder: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  aspect?: "square" | "video" | "wide";
  className?: string;
  allowVideo?: boolean;
  onUploaded?: (result: UploadResult) => void;
}

/**
 * Seleção, compressão e envio de imagens para o Supabase Storage.
 * Mostra pré-visualizações e permite remover/reordenar (remoção apenas).
 */
export function ImageUploader({
  bucket,
  folder,
  value,
  onChange,
  max = 1,
  label = "Adicionar fotografia",
  aspect = "video",
  className,
  allowVideo = false,
  onUploaded,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "wide" ? "aspect-[3/1]" : "aspect-video";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - value.length;
    const selected = Array.from(files).slice(0, Math.max(0, remaining));
    if (selected.length < files.length) toast.warning(`Pode adicionar no máximo ${max} ficheiro(s).`);
    setUploading(selected.length);
    const urls: string[] = [];
    for (const file of selected) {
      try {
        const result = await uploadFile(file, bucket, folder, { allowVideo });
        urls.push(result.url);
        onUploaded?.(result);
      } catch (err) {
        toast.error(err instanceof UploadError ? err.message : "Não foi possível enviar o ficheiro.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (urls.length) onChange(max === 1 ? urls.slice(0, 1) : [...value, ...urls]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("grid gap-3", max > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
        {value.map((url) => (
          <div key={url} className={cn("relative overflow-hidden rounded-xl border bg-muted", aspectClass)}>
            {isVideo(url) ? (
              <video src={url} className="size-full object-cover" muted playsInline />
            ) : (
              <Image src={url} alt="" fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute top-2 right-2 bg-white/90 shadow"
              onClick={() => onChange(value.filter((v) => v !== url))}
              aria-label="Remover"
            >
              <X />
            </Button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-card text-sm text-muted-foreground transition-colors hover:border-turquoise hover:text-ocean disabled:opacity-60",
              aspectClass,
            )}
          >
            {uploading > 0 ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            <span className="px-2 text-center">{uploading > 0 ? "A enviar…" : label}</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={allowVideo ? "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
        multiple={max > 1}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        tabIndex={-1}
      />
      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WEBP{allowVideo ? " · vídeos MP4 até 25 MB" : ""}. As imagens são comprimidas automaticamente.
      </p>
    </div>
  );
}
