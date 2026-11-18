import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { CoverImage } from "@/components/shared/cover-image";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { listGuidePages } from "@/services/guide";

export const metadata: Metadata = {
  title: "Descobrir a Ilha de Inhaca",
  description: "Guia da Ilha de Inhaca: história, cultura, praias, natureza, gastronomia, atividades, transportes e informações para visitantes.",
  alternates: { canonical: "/descobrir" },
};

export default async function DiscoverPage() {
  const pages = await listGuidePages(await createClient());
  return (
    <div className="container-page py-8 sm:py-12">
      <PageHeader
        eyebrow="Guia turístico"
        title="Descobrir Inhaca"
        description="Tudo o que precisa de saber sobre a ilha: a sua história, cultura, natureza e como a visitar de forma responsável."
      />
      {pages.length === 0 ? (
        <EmptyState icon={Compass} title="O guia está a ser preparado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p, i) => (
            <Link
              key={p.id}
              href={`/descobrir/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CoverImage src={p.cover_url} alt={p.title} className="aspect-[16/9]" priority={i < 3} />
              <div className="flex flex-1 flex-col p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-turquoise-light text-ocean">
                  <DynamicIcon name={p.icon} className="size-5" />
                </span>
                <h2 className="mt-3 text-lg font-bold text-ocean group-hover:text-turquoise">{p.title}</h2>
                {p.excerpt ? <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p> : null}
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-turquoise">
                  Ler mais <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
