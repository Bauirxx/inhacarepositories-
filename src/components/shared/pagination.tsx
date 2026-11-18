import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Paginação simples por URL (?page=N), preservando os restantes parâmetros. */
export function Pagination({
  page,
  hasMore,
  basePath,
  searchParams,
}: {
  page: number;
  hasMore: boolean;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (page <= 1 && !hasMore) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={href(page - 1)} rel="prev">
            <ChevronLeft /> Anterior
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ChevronLeft /> Anterior
        </Button>
      )}
      <span className="text-sm text-muted-foreground">Página {page}</span>
      {hasMore ? (
        <Button asChild variant="outline">
          <Link href={href(page + 1)} rel="next">
            Seguinte <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Seguinte <ChevronRight />
        </Button>
      )}
    </nav>
  );
}
