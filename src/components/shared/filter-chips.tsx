import Link from "next/link";
import { cn } from "@/lib/utils";

/** Filtros horizontais roláveis (mobile) baseados em parâmetros de URL. */
export function FilterChips({
  options,
  active,
  basePath,
  param,
  searchParams,
  allLabel = "Todos",
}: {
  options: { value: string; label: string }[];
  active?: string | null;
  basePath: string;
  param: string;
  searchParams?: Record<string, string | undefined>;
  allLabel?: string;
}) {
  const href = (value: string | null) => {
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([k, v]) => {
      if (v && k !== param && k !== "page") params.set(k, v);
    });
    if (value) params.set(param, value);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const chip = (value: string | null, label: string) => {
    const isActive = (active ?? null) === value;
    return (
      <Link
        key={value ?? "__all"}
        href={href(value)}
        scroll={false}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
          isActive
            ? "border-ocean bg-ocean text-white"
            : "border-border bg-card text-foreground/80 hover:border-turquoise hover:text-ocean",
        )}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chip(null, allLabel)}
      {options.map((o) => chip(o.value, o.label))}
    </div>
  );
}
