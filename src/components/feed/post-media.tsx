"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PostMedia } from "@/types";

export function PostMediaGrid({ media }: { media: PostMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!media.length) return null;
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;

  return (
    <>
      <div
        className={cn(
          "grid gap-1 overflow-hidden rounded-xl",
          shown.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {shown.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className={cn(
              "relative block overflow-hidden bg-muted",
              shown.length === 1 ? "aspect-[4/3] max-h-[520px]" : "aspect-square",
              shown.length === 3 && i === 0 && "row-span-2 aspect-auto",
            )}
            aria-label={`Abrir ${m.type === "video" ? "vídeo" : "fotografia"} ${i + 1}`}
          >
            {m.type === "video" ? (
              <video src={m.url} className="size-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <Image src={m.url} alt="" fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
            )}
            {m.type === "video" ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">▶ Vídeo</span>
              </span>
            ) : null}
            {i === shown.length - 1 && extra > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white">
                +{extra}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <Dialog open={openIndex !== null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent showCloseButton={false} className="max-w-[min(96vw,1000px)] border-0 bg-black p-0 sm:max-w-[min(96vw,1000px)]">
          <DialogTitle className="sr-only">Galeria</DialogTitle>
          {openIndex !== null ? (
            <div className="relative flex max-h-[88dvh] items-center justify-center">
              {media[openIndex].type === "video" ? (
                <video src={media[openIndex].url} controls autoPlay playsInline className="max-h-[88dvh] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media[openIndex].url} alt="" className="max-h-[88dvh] w-auto object-contain" />
              )}
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Fechar"
              >
                <X />
              </button>
              {media.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenIndex((openIndex - 1 + media.length) % media.length)}
                    className="absolute left-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenIndex((openIndex + 1) % media.length)}
                    className="absolute right-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Seguinte"
                  >
                    <ChevronRight />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
