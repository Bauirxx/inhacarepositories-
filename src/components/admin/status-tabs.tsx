import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatusTabs({
  basePath,
  active,
  options,
  param = "estado",
}: {
  basePath: string;
  active: string;
  options: { value: string; label: string }[];
  param?: string;
}) {
  return (
    <div className="scrollbar-none -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <Link
          key={o.value}
          href={`${basePath}?${param}=${o.value}`}
          className={cn(
            "flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-medium",
            active === o.value ? "bg-ocean text-white" : "bg-card text-foreground/80 hover:bg-muted",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
