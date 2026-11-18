import type { Metadata } from "next";
import Link from "next/link";
import { FeedList } from "@/components/feed/feed-list";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { AdSlot } from "@/components/shared/ad-slot";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/permissions/roles";
import { listPosts } from "@/services/posts";
import { listActiveAds } from "@/services/ads";
import { listUpcomingEvents } from "@/services/events";
import { postCategoryLabels } from "@/config/site";
import { postCategoryEnum } from "@/lib/validations/post";
import { formatEventDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Feed da ilha",
  description: "Notícias, avisos, fotografias, eventos e oportunidades partilhadas pela comunidade da Ilha de Inhaca.",
  alternates: { canonical: "/feed" },
};

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const sp = await searchParams;
  const parsedCategory = postCategoryEnum.safeParse(sp.categoria);
  const category = parsedCategory.success ? parsedCategory.data : null;

  const supabase = await createClient();
  const user = await getCurrentUser();
  const [{ items, nextCursor }, ads, events] = await Promise.all([
    listPosts(supabase, { category, userId: user?.id ?? null, includePinned: true }),
    listActiveAds(supabase, "feed", 1),
    listUpcomingEvents(supabase, 3),
  ]);

  const viewer = user ? { id: user.id, isStaff: isModerator(user.roles) } : null;

  return (
    <div className="container-page py-6 sm:py-10">
      <PageHeader title="Feed da ilha" description="O que está a acontecer na Ilha de Inhaca, partilhado pela comunidade." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          <div className="mb-4">
            <FilterChips
              basePath="/feed"
              param="categoria"
              active={category}
              options={Object.entries(postCategoryLabels).map(([value, label]) => ({ value, label }))}
              allLabel="Tudo"
            />
          </div>
          {!user ? (
            <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border bg-turquoise-light p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-ocean">Entre para publicar, gostar, comentar e guardar publicações.</p>
              <Button asChild size="sm">
                <Link href="/entrar?next=/feed">Entrar</Link>
              </Button>
            </div>
          ) : null}
          <FeedList
            initialPosts={items}
            initialCursor={nextCursor}
            category={category}
            viewer={viewer}
            composerUser={user ? { id: user.id, name: user.profile.full_name, avatar: user.profile.avatar_url } : null}
          />
        </div>
        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-24 space-y-4">
            {ads[0] ? <AdSlot ad={ads[0]} /> : null}
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="font-bold text-ocean">Próximos eventos</h2>
              {events.length ? (
                <ul className="mt-3 space-y-3">
                  {events.map((e) => (
                    <li key={e.id}>
                      <Link href={`/agenda/${e.slug}`} className="block hover:text-turquoise">
                        <span className="block text-sm font-semibold">{e.title}</span>
                        <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                          {formatEventDate(e.starts_at, e.ends_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sem eventos agendados.</p>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <h2 className="font-bold text-ocean">Regras da comunidade</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                <li>Seja respeitoso e construtivo.</li>
                <li>Não publique informação falsa.</li>
                <li>Publicidade apenas na categoria Comércio.</li>
                <li>Denuncie conteúdos inapropriados.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
