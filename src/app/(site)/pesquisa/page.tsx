import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { globalSearch, searchKindLabels } from "@/services/search";
import type { SearchResult } from "@/types";

export const metadata: Metadata = { title: "Pesquisa", robots: { index: false, follow: true } };

const ORDER: SearchResult["kind"][] = ["business", "event", "product", "guide", "post", "profile"];

export default async function SearchPage({ searchParams }: PageProps<"/pesquisa">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const results = q.trim().length >= 2 ? await globalSearch(await createClient(), q) : [];
  const grouped = ORDER.map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) })).filter((g) => g.items.length);

  return (
    <div className="container-page max-w-4xl py-6 sm:py-10">
      <PageHeader title="Pesquisar na ilha" description="Estabelecimentos, eventos, produtos, guia, publicações e pessoas." />
      <SearchForm action="/pesquisa" defaultValue={q} large placeholder="O que procura?" />
      <div className="mt-8">
        {q.trim().length < 2 ? (
          <p className="text-sm text-muted-foreground">Escreva pelo menos 2 caracteres.</p>
        ) : grouped.length === 0 ? (
          <EmptyState icon={Search} title="Sem resultados" description={`Não encontrámos nada para “${q}”.`} />
        ) : (
          <div className="space-y-8">
            {grouped.map((g) => (
              <section key={g.kind}>
                <h2 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">{searchKindLabels[g.kind]}</h2>
                <ul className="divide-y rounded-2xl border bg-card shadow-sm">
                  {g.items.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link href={r.href} className="flex min-h-16 items-center gap-3 p-3 hover:bg-muted">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-turquoise-light">
                          {r.image_url && r.image_url.startsWith("http") ? (
                            <Image src={r.image_url} alt="" fill sizes="48px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ocean">{r.title}</p>
                          {r.subtitle ? <p className="truncate text-sm text-muted-foreground">{r.subtitle}</p> : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
