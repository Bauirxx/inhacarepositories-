import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Compass,
  Info,
  Map,
  MessagesSquare,
  Newspaper,
  ShoppingBasket,
  Ship,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/shared/search-form";
import { IllustrativeNote } from "@/components/shared/cover-image";
import { EmptyState } from "@/components/shared/empty-state";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { AdSlot } from "@/components/shared/ad-slot";
import { BusinessCard } from "@/components/business/business-card";
import { EventCard } from "@/components/events/event-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { MobileSeeAll, SectionHeading } from "@/components/home/section-heading";
import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/server";
import { listBusinessCategories, listFeaturedBusinesses } from "@/services/businesses";
import { listUpcomingEvents } from "@/services/events";
import { listRecentPosts } from "@/services/posts";
import { listRecentProducts } from "@/services/products";
import { listGuidePages } from "@/services/guide";
import { getSiteSettings } from "@/services/settings";
import { listActiveAds } from "@/services/ads";
import { postCategoryLabels, siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — Ilha de Inhaca, Moçambique` },
  alternates: { canonical: "/" },
};

const usefulInfo = [
  { href: "/descobrir/como-chegar", icon: Ship, title: "Como chegar", text: "Barcos, lanchas e voos a partir de Maputo." },
  { href: "/descobrir/informacoes-visitantes", icon: Info, title: "Informações úteis", text: "Saúde, dinheiro, rede móvel e segurança." },
  { href: "/comunidade/grupos/transportes", icon: MessagesSquare, title: "Avisos de transporte", text: "Horários e alterações em tempo real." },
  { href: "/agenda", icon: CalendarDays, title: "Agenda da ilha", text: "Festas, cultura, desporto e atividades." },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [settings, categories, featured, events, posts, products, guide, ads] = await Promise.all([
    getSiteSettings(supabase),
    listBusinessCategories(supabase),
    listFeaturedBusinesses(supabase, 6),
    listUpcomingEvents(supabase, 4),
    listRecentPosts(supabase, 4),
    listRecentProducts(supabase, 4),
    listGuidePages(supabase),
    listActiveAds(supabase, "home", 1),
  ]);

  const heroImage = settings.hero_image_url || "/images/placeholders/hero-inhaca.svg";
  const heroIsPlaceholder = heroImage.includes("/placeholders/");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: env.siteUrl,
    description: siteConfig.description,
    inLanguage: "pt",
    potentialAction: {
      "@type": "SearchAction",
      target: `${env.siteUrl}/pesquisa?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    about: { "@type": "Place", name: "Ilha de Inhaca", address: { "@type": "PostalAddress", addressCountry: "MZ" } },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" unoptimized={heroImage.endsWith(".svg")} />
          <div className="gradient-hero absolute inset-0" />
        </div>
        <div className="container-page flex min-h-[78svh] flex-col justify-end pt-24 pb-10 sm:min-h-[640px] sm:pb-16">
          <p className="animate-fade-up text-xs font-bold tracking-[0.3em] text-sand uppercase">Ilha de Inhaca · Moçambique</p>
          <h1 className="mt-3 max-w-3xl animate-fade-up text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-6xl">
            {settings.hero_title}
          </h1>
          <p className="mt-4 max-w-2xl animate-fade-up text-base text-white/85 sm:text-lg">{settings.hero_subtitle}</p>
          <div className="mt-7 grid animate-fade-up gap-3 sm:flex sm:flex-wrap">
            <Button asChild size="lg" variant="sand">
              <Link href="/descobrir">
                <Compass /> Explorar a ilha
              </Link>
            </Button>
            <Button asChild size="lg" variant="turquoise">
              <Link href="/mapa">
                <Map /> Consultar o mapa
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline-light">
              <Link href="/servicos">
                <Briefcase /> Descobrir serviços
              </Link>
            </Button>
          </div>
          <div className="mt-8 max-w-2xl">
            <SearchForm action="/pesquisa" large placeholder="Hotéis, restaurantes, eventos, produtos…" />
          </div>
        </div>
        {heroIsPlaceholder ? <IllustrativeNote className="absolute right-3 bottom-3" /> : null}
      </section>

      {/* CATEGORIAS */}
      <section className="container-page -mt-2 py-10 sm:py-14" aria-labelledby="categorias">
        <SectionHeading eyebrow="Diretório" title="O que procura?" description="Explore os serviços da ilha por categoria." />
        <h2 id="categorias" className="sr-only">
          Categorias de serviços
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/servicos?categoria=${c.slug}`}
              className="group flex min-h-24 flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-turquoise hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-turquoise-light text-ocean transition-colors group-hover:bg-turquoise group-hover:text-white">
                <DynamicIcon name={c.icon} className="size-5" />
              </span>
              <span className="mt-3 text-sm leading-tight font-semibold text-ocean">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ESTABELECIMENTOS EM DESTAQUE */}
      <section className="bg-card/60 py-10 sm:py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="Em destaque"
            title="Onde ficar, comer e explorar"
            description="Estabelecimentos aprovados pela administração da plataforma."
            href="/servicos"
          />
          {featured.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
              <MobileSeeAll href="/servicos" />
            </>
          ) : (
            <EmptyState
              icon={Store}
              title="Os primeiros estabelecimentos estão a chegar"
              description="Tem um hotel, restaurante ou serviço na ilha? Registe-o gratuitamente e ganhe visibilidade."
              action={
                <Button asChild>
                  <Link href="/dashboard/negocios/novo">Registar o meu negócio</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* PRÓXIMOS EVENTOS */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading eyebrow="Agenda" title="Próximos acontecimentos" href="/agenda" />
        {events.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
            <MobileSeeAll href="/agenda" />
          </>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Sem eventos agendados"
            description="Organiza uma festa, competição ou atividade? Divulgue-a na agenda."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/eventos/novo">Submeter evento</Link>
              </Button>
            }
          />
        )}
      </section>

      {ads[0] ? (
        <div className="container-page pb-4">
          <AdSlot ad={ads[0]} />
        </div>
      ) : null}

      {/* EXPERIÊNCIAS / GUIA */}
      <section className="gradient-ocean py-12 text-white sm:py-16">
        <div className="container-page">
          <p className="text-xs font-bold tracking-widest text-sand uppercase">Descobrir Inhaca</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Experiências e guia da ilha</h2>
          <p className="mt-2 max-w-2xl text-white/75">História, praias, natureza, gastronomia e tudo o que precisa de saber antes de visitar.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guide.slice(0, 8).map((g) => (
              <Link
                key={g.id}
                href={`/descobrir/${g.slug}`}
                className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand text-ocean">
                  <DynamicIcon name={g.icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{g.title}</span>
                  {g.excerpt ? <span className="mt-0.5 line-clamp-2 block text-sm text-white/65">{g.excerpt}</span> : null}
                </span>
              </Link>
            ))}
          </div>
          <Button asChild variant="sand" size="lg" className="mt-8">
            <Link href="/descobrir">
              Abrir o guia completo <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* PUBLICAÇÕES RECENTES + MERCADO */}
      <section className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionHeading eyebrow="Feed da ilha" title="Publicações recentes" href="/feed" />
          {posts.length ? (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/feed/${p.id}`} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-turquoise">
                    <UserAvatar name={p.author?.full_name} src={p.author?.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-semibold text-ocean">{p.author?.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {postCategoryLabels[p.category]} · <RelativeTime value={p.created_at} />
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/85">
                        {p.content ? truncate(p.content, 180) : p.media?.length ? "Partilhou fotografias." : ""}
                      </p>
                    </div>
                    {p.media?.[0] && p.media[0].type === "image" ? (
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                        <Image src={p.media[0].url} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Newspaper} title="O feed está à espera da primeira publicação" />
          )}
          <MobileSeeAll href="/feed" label="Abrir o feed" />
        </div>
        <div className="lg:col-span-2">
          <SectionHeading eyebrow="Mercado local" title="Produtos da ilha" href="/mercado" />
          {products.length ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShoppingBasket}
              title="Ainda sem produtos"
              description="Peixe, artesanato, produtos agrícolas… Divulgue o que vende."
              action={
                <Button asChild variant="outline">
                  <Link href="/dashboard/produtos/novo">Publicar produto</Link>
                </Button>
              }
            />
          )}
          <MobileSeeAll href="/mercado" label="Ir ao mercado" />
        </div>
      </section>

      {/* INFORMAÇÕES ÚTEIS */}
      <section className="container-page pb-6">
        <SectionHeading eyebrow="Para visitantes" title="Informações úteis" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {usefulInfo.map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm hover:border-turquoise">
              <Icon className="mt-0.5 size-6 shrink-0 text-turquoise" aria-hidden />
              <span>
                <span className="block font-semibold text-ocean">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA COMUNIDADE */}
      <section className="container-page py-10">
        <div className="relative overflow-hidden rounded-3xl bg-sand p-6 sm:p-10">
          <div className="max-w-xl">
            <h2 className="text-2xl font-extrabold text-ocean-deep sm:text-3xl">Faça parte da comunidade</h2>
            <p className="mt-2 text-ocean-deep/80">
              Converse no chat da ilha, junte-se a grupos, peça ajuda e divulgue o seu negócio. É gratuito.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/registar">Criar conta</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent">
                <Link href="/comunidade">Ver a comunidade</Link>
              </Button>
            </div>
          </div>
          <svg viewBox="0 0 200 200" className="absolute -right-10 -bottom-10 hidden size-72 opacity-25 sm:block" aria-hidden>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#153E42" strokeWidth="10" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="#153E42" strokeWidth="10" />
            <circle cx="100" cy="100" r="20" fill="#153E42" />
          </svg>
        </div>
      </section>
    </>
  );
}
