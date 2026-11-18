import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Formulário de pesquisa por GET (funciona sem JavaScript). */
export function SearchForm({
  action,
  defaultValue,
  placeholder = "Pesquisar…",
  hidden,
  className,
  large,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  hidden?: Record<string, string | undefined>;
  className?: string;
  large?: boolean;
}) {
  return (
    <form action={action} method="get" role="search" className={cn("relative", className)}>
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Search
        className={cn("pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground", large ? "size-5" : "size-4")}
        aria-hidden
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-full border border-input bg-card pr-4 shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          large ? "h-14 pl-12 text-base" : "h-11 pl-10",
        )}
        maxLength={100}
      />
    </form>
  );
}
