import Image from "next/image";
import { safeExternalUrl } from "@/lib/utils";
import type { Advertisement } from "@/types";

/** Espaço publicitário gerido no painel administrativo. */
export function AdSlot({ ad }: { ad: Advertisement | undefined }) {
  if (!ad) return null;
  const href = safeExternalUrl(ad.link_url);
  const content = (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
      {ad.image_url ? (
        <div className="relative aspect-[4/1] min-h-24 w-full">
          <Image src={ad.image_url} alt={ad.title} fill sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" />
        </div>
      ) : (
        <div className="gradient-ocean p-6 text-white">
          <p className="text-lg font-bold">{ad.title}</p>
          {ad.advertiser_name ? <p className="text-sm text-white/70">{ad.advertiser_name}</p> : null}
        </div>
      )}
      <span className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
        Publicidade
      </span>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" aria-label={`Publicidade: ${ad.title}`}>
      {content}
    </a>
  ) : (
    content
  );
}
