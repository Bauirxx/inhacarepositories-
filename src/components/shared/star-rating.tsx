import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  const iconSize = size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Classificação ${value.toFixed(1)} de 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(iconSize, i <= rounded ? "fill-sand text-sand" : "text-border")}
            aria-hidden
          />
        ))}
      </span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground">
          {value > 0 ? value.toFixed(1) : "—"} ({count})
        </span>
      ) : null}
    </span>
  );
}
