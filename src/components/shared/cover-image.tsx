import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Imagem de capa com fallback visual (gradiente + ícone) quando não existe
 * fotografia. Evita usar imagens genéricas como se fossem reais.
 */
export function CoverImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority,
  icon: Icon = ImageIcon,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-turquoise-light via-natural to-sand-light">
          <Icon className="size-10 text-ocean/30" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function IllustrativeNote({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur",
        className,
      )}
    >
      Imagem ilustrativa
    </span>
  );
}
