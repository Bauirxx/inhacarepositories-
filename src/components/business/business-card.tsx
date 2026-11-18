import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import { CoverImage } from "@/components/shared/cover-image";
import { StarRating } from "@/components/shared/star-rating";
import { DynamicIcon, getIcon } from "@/components/shared/dynamic-icon";
import type { Business } from "@/types";

export function BusinessCard({ business }: { business: Business }) {
  const Icon = getIcon(business.category?.icon);
  return (
    <Link
      href={`/servicos/${business.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative">
        <CoverImage
          src={business.cover_url ?? business.media?.[0]?.url}
          alt={business.name}
          className="aspect-[16/10]"
          icon={Icon}
        />
        {business.is_featured ? (
          <span className="absolute top-3 left-3 rounded-full bg-sand px-2.5 py-1 text-[11px] font-bold text-ocean-deep shadow">
            Destaque
          </span>
        ) : null}
        {business.logo_url ? (
          <div className="absolute -bottom-6 left-4 size-12 overflow-hidden rounded-xl border-2 border-card bg-card shadow">
            <Image src={business.logo_url} alt="" fill sizes="48px" className="object-cover" />
          </div>
        ) : null}
      </div>
      <div className={business.logo_url ? "flex flex-1 flex-col p-4 pt-8" : "flex flex-1 flex-col p-4"}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-turquoise">
          <DynamicIcon name={business.category?.icon} className="size-3.5" />
          {business.category?.name}
        </p>
        <h3 className="mt-1 flex items-center gap-1.5 text-base font-bold text-ocean group-hover:text-turquoise">
          <span className="line-clamp-1">{business.name}</span>
          {business.is_verified ? <BadgeCheck className="size-4 shrink-0 text-turquoise" aria-label="Verificado" /> : null}
        </h3>
        {business.short_description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{business.short_description}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <StarRating value={Number(business.rating_avg)} count={business.rating_count} />
          {business.address ? (
            <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{business.address}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
