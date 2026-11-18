import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CoverImage } from "@/components/shared/cover-image";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { createClient } from "@/lib/supabase/server";
import { getGuidePage, listGuidePages } from "@/services/guide";
import { Markdown, stripMarkdown } from "@/lib/utils/markdown";
import { formatDate, truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/descobrir/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getGuidePage(await createClient(), slug);
  if (!page) return { title: "Página não encontrada" };
  const description = page.excerpt || truncate(stripMarkdown(page.content), 160);
  return {
    title: page.title,
    description,
    alternates: { canonical: `/descobrir/${page.slug}` },
    openGraph: { title: page.title, description, images: page.cover_url ? [page.cover_url] : undefined },
  };
}

export default async function GuidePage({ params }: PageProps<"/descobrir/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const [page, all] = await Promise.all([getGuidePage(supabase, slug), listGuidePages(supabase)]);
  if (!page || !page.is_published) notFound();
  const others = all.filter((p) => p.id !== page.id);

  return (
    <article>
      <div className="relative">
        <CoverImage src={page.cover_url} alt={page.title} className="h-48 sm:h-72" priority sizes="100vw" />
        <div className="gradient-hero absolute inset-0" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-6">
          <Link href="/descobrir" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft className="size-4" /> Guia da ilha
          </Link>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-white sm:text-4xl">
            <span className="hidden size-12 items-center justify-center rounded-2xl bg-sand text-ocean sm:flex">
              <DynamicIcon name={page.icon} className="size-6" />
            </span>
            {page.title}
          </h1>
        </div>
      </div>
      <div className="container-page grid gap-10 py-8 lg:grid-cols-[1fr_300px]">
        <div className="max-w-3xl">
          {page.excerpt ? <p className="mb-6 text-lg text-muted-foreground">{page.excerpt}</p> : null}
          <Markdown source={page.content} />
          <p className="mt-10 text-xs text-muted-foreground">Atualizado em {formatDate(page.updated_at)}</p>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">Continuar a explorar</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/descobrir/${o.slug}`} className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3 py-2 hover:border-turquoise">
                  <DynamicIcon name={o.icon} className="size-5 text-turquoise" />
                  <span className="text-sm font-medium text-ocean">{o.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
