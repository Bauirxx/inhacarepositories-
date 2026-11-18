import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { CoverImage } from "@/components/shared/cover-image";
import { getIcon } from "@/components/shared/dynamic-icon";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const Icon = getIcon(product.category?.icon) ?? Package;
  return (
    <Link
      href={`/mercado/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <CoverImage
          src={product.images?.[0]}
          alt={product.title}
          className="aspect-square"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          icon={Icon}
        />
        {product.status === "sold_out" ? (
          <span className="absolute inset-x-0 bottom-0 bg-ocean/85 py-1.5 text-center text-xs font-bold text-white">
            Esgotado
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-base font-extrabold text-ocean">
          {formatMoney(product.price, product.currency)}
          {product.unit && product.price !== null ? (
            <span className="text-xs font-medium text-muted-foreground"> / {product.unit}</span>
          ) : null}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground group-hover:text-turquoise">{product.title}</h3>
        {product.location ? (
          <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{product.location}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
